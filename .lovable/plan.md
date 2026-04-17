

# Auditoria & Checkpoint InstaBench — estado real, sem código novo

## Sumário do entendimento

**Produto**: InstaBench — análise editorial de perfis públicos do Instagram em pt-PT, dark-first, freemium com escada (grátis → 3€ pontual → 10€/mês Pro → 39€/mês Agency).
**Stack real**: TanStack Start v1 + Vite + Tailwind v4 + shadcn/ui, Supabase (Postgres + Storage), Apify, Resend, `@react-pdf/renderer`. **Sem** Edge Functions Supabase — toda a lógica server vive em routes `src/routes/api/*` no Worker do TanStack Start.
**Memória aplicada**: dark Editorial Tech Noir, tokens em `tokens.css`, ficheiros locked respeitados.

---

## 1) Frontend / Landing

| Item | Estado | Evidência |
|---|---|---|
| `/` hero + how-it-works + product-preview + social-proof | implementado | `src/routes/index.tsx` + secções locked Sprint 1 |
| `/privacidade` e `/termos` | implementado | criados na última iteração |
| `/design-system` | implementado | rota dedicada |
| Copy pt-PT impessoal | conforme | spot-checks ok |
| Mobile 375px | não validado fisicamente nesta auditoria | — |
| Micro-prova "RGPD compliant" | conforme à realidade pós-/privacidade | — |

**Veredito**: landing **suficiente para MVP**. Não há razão para mais polish antes de provar pipeline.

---

## 2) Análise pública `/analyze/$username`

| Item | Estado |
|---|---|
| Rota carrega + SSR-disabled correto | real |
| Header, métricas-chave, benchmark block, comparação concorrentes | real, ligado a dados Apify normalizados |
| Conversion layer + premium-locked + gate modal | real |
| Username inválido → erro humano em pt-PT | real (Zod + `INVALID_USERNAME`) |
| Sem competitors → degrada graciosamente | real |
| **`PREMIUM_TEASERS` no dashboard** ("12K-38K", "3 insights") | **mock estático hardcoded** — visíveis ao utilizador como teasers de upgrade |

**Veredito**: análise pública é **real**. Os teasers premium são a única superfície mock visível e são honestos como teasers (não números do perfil).

---

## 3) Apify / Provider

| Item | Estado | Evidência |
|---|---|---|
| `APIFY_TOKEN` configurado | sim | secrets list |
| Atores usados | `apify/instagram-profile-scraper` + `apify/instagram-post-scraper` | `analyze-public-v1.ts` |
| Endpoint `run-sync-get-dataset-items` | implementado | `apify-client.ts` |
| Server-only, token nunca no browser | conforme | route boundary |
| Normalização → `PublicAnalysisResponse` estável | implementado | `normalize.ts` |
| Stale-while-error fallback (≤7d) | implementado | `analyze-public-v1.ts` |
| **Validado end-to-end com perfil real** | **não verificado nesta auditoria** | `analysis_snapshots` está vazia (0 linhas) — sugere que ninguém chegou a correr analyses bem-sucedidas que persistissem ainda, OU o utilizador já correu mas as snapshots expiraram |

**Veredito**: implementação **completa e arquitetonicamente correta**. Falta evidência empírica de uma corrida real recente.

---

## 4) Supabase / Data Layer

**Tabelas reais** (`information_schema`): `analysis_snapshots`, `benchmark_references`, `leads`, `report_requests`. **Sem** tabelas EuPago/payments, sem tabelas Pro/subscriptions, sem `user_roles`.

**RLS**: `pg_policies` retorna **0 políticas em `public.*`**. Todas as escritas passam pela admin client (service role) via routes server. Leituras anónimas estão **bloqueadas** porque RLS está enabled mas sem policies — confirma o desenho "tudo via boundary server".

**Dados reais**: 0 leads, 0 report_requests, 0 snapshots, **15 benchmark_references** ativas (3 formatos × 5 tiers). Engine de benchmark tem dataset real.

**Veredito**: schema **enxuto e coerente**. Sem dead schema. Falta `user_roles` e tabelas de payments — mas só fazem sense quando esses módulos forem construídos.

---

## 5) Snapshot + Cache

| Item | Estado |
|---|---|
| `analysis_snapshots` existe + payload normalizado em JSONB | real |
| `cache_key` determinístico (primary + competitors normalizados) | implementado em `cache.ts` |
| Lookup antes de chamar provider | implementado |
| TTL fresh + janela stale-while-error 7d | implementado |
| `?refresh=1` bypass para dev | implementado |
| **Validado com tráfego real** | **0 linhas hoje** — não validado empiricamente |

**Veredito**: implementação **completa**. Falta um teste real para confirmar.

---

## 6) Report Request Flow

Fluxo único e claro:
1. Modal `<ReportGateModal>` → `requestFullReport()` → `POST /api/request-full-report`
2. Server: valida snapshot → upsert `leads` por `email_normalized` → conta uso mensal → quota gate (`FREE_MONTHLY_LIMIT=2`) → insert `report_requests` linkado ao snapshot → **dispara `runReportPipeline` em background**

**Quota**: server-enforced (não localStorage). Race condition assumida como risco aceitável v1.
**Snapshot mismatch**: bloqueia com `409 SNAPSHOT_MISMATCH`.

**Veredito**: fluxo **único, sem duplicações, source of truth = `report_requests`**. Sólido.

---

## 7) PDF Generation

| Item | Estado |
|---|---|
| `POST /api/generate-report-pdf` existe | real |
| Aceita `report_request_id` | real |
| Resolve `analysis_snapshot_id` → JSONB → `renderReportPdf` | real |
| Renderiza com `@react-pdf/renderer` server-side | real (`render.ts`) |
| Avatar fetch best-effort com timeout 3s | real |
| Upload para bucket privado `report-pdfs` | real (bucket existe, public=false) |
| Persiste `pdf_status='ready'` + path + timestamp | real |
| Idempotente (curto-circuita se já `ready`) | real |
| **Renderização validada visualmente** | **não verificado** — nunca foi gerado um PDF real (0 report_requests) |

⚠️ **Risco real (Worker runtime)**: `@react-pdf/renderer` é uma das libs com maior risco em ambientes Worker mesmo com `nodejs_compat`. **Não está empiricamente provado** que renderiza no Cloudflare Worker em produção. Preview Lovable corre num runtime diferente do Worker final.

**Veredito**: código **completo**, mas **não validado em runtime real**. É o maior risco técnico não provado.

---

## 8) Email Delivery

| Item | Estado |
|---|---|
| `POST /api/send-report-email` existe | real |
| `RESEND_API_KEY` + `INTERNAL_API_TOKEN` configurados | sim |
| Envio só a partir de `pdf_status='ready'` + path | real |
| Signed URL 7d | real |
| Optimistic lock contra envios duplicados | real |
| **Sender = `onboarding@resend.dev` (sandbox)** | **bloqueador** — só envia para o email do dono da conta Resend; outros recipientes recebem `RESEND_SANDBOX_RECIPIENT_BLOCKED` |
| Template pt-PT em `report-email-template.ts` | real |
| Tracking (`email_sent_at`, `email_message_id`, `email_error_message`) | real |

**Veredito**: lógica **completa**, mas **bloqueado para utilizadores reais** até verificar domínio na Resend.

---

## 9) Orchestration (request → PDF → email)

`src/lib/orchestration/run-report-pipeline.ts`: aceita o request, orquestra PDF → email, atualiza `request_status` (`pending → processing → completed | failed_pdf | failed_email`). Idempotente, fire-and-forget via `runInBackground` (usa `ctx.waitUntil` quando disponível).

⚠️ **Risco arquitetónico**: pipeline corre **em background do Worker** que processou o POST. Em Cloudflare Workers sem `waitUntil` propagado, o Worker pode terminar antes de completar — o código tem fallback `void safe` mas é frágil. Para volumes baixos do MVP é aceitável; não é production-grade para escala.

**Veredito**: pipeline **automático no papel**, **fragilidade conhecida**, **não validado end-to-end**.

---

## 10) EuPago / Pagamentos

`grep` em todo o codebase: **0 resultados** para `eupago`. Não há rota, não há webhook, não há tabela `payments`/`subscriptions`, não há criação de pay-by-link, não há atualização de estado pós-pagamento.

UI mostra "Em breve" no paywall e "Pedir acesso" via `mailto:` para Pro/Agency — honesto.

**Veredito**: **não iniciado**. Toda a camada paga é UX honesta a dizer "em breve".

---

## 11) Admin / Operations

`/admin` real com:
- gate por `INTERNAL_API_TOKEN` (server-validated, cookie httpOnly)
- listagem de `report_requests` com filtros (`/api/admin/report-requests`)
- detalhe (`/api/admin/report-requests/$id`)
- ações: `regenerate-pdf` + `resend-email`
- `noindex` no `<head>`

**Veredito**: **suficiente para MVP**. Falta visibilidade sobre `analysis_snapshots` e métricas agregadas (não bloqueante).

---

## 12) MVP Readiness

| Área | Status | Conf. | Bloqueia MVP? | Notas |
|---|---|---|---|---|
| Landing | implementado | high | não | bom o suficiente |
| Análise pública | implementado | high | não | teasers premium são mock honesto |
| Apify | implementado | medium | não | falta validação empírica recente |
| Supabase / schema | implementado | high | não | enxuto, sem dead schema |
| Snapshot/cache | implementado | medium | não | não validado em tráfego |
| Request flow | implementado | high | não | source of truth claro |
| PDF generation | implementado | **low** | **sim — runtime risk** | nunca gerado em produção |
| Email delivery | implementado | medium | **sim — sandbox Resend** | bloqueia para utilizadores ≠ dono Resend |
| Orchestration | implementado | medium | não no curto prazo | frágil mas tolerável v1 |
| EuPago | missing | high | sim, para tier 3 | tier grátis não bloqueia |
| Admin | implementado | high | não | suficiente |
| AI insights no PDF | mock | high | não | está honesto como teaser |

**Respostas explícitas**:

- **A. Analisar perfil real via Apify?** Sim, código pronto. Não validado empiricamente nesta auditoria.
- **B. Mostrar análise pública fiável?** Sim. Snapshots + stale-while-error garantem robustez razoável.
- **C. Pedir relatório completo e persistir?** Sim. Quota server-enforced, snapshot validation, sem duplicações.
- **D. Gerar PDF real a partir de snapshot?** Código sim, **runtime não provado**. Maior risco técnico.
- **E. Enviar por email?** Código sim, **bloqueado pelo sandbox Resend** para qualquer recipiente que não seja o dono da conta.
- **F. Pipeline automático request→PDF→email a funcionar?** Não verificável — 0 `report_requests` na BD. Existe arquitetura, falta proof-of-life.
- **G. EuPago integrado?** Não. 0 código.
- **H. Testável como MVP real hoje?** **Parcialmente** — só end-to-end com (1) email do dono Resend e (2) PDF a renderizar de facto no Worker. Ambos são suposições não validadas.
- **I. 5 gaps prioritários**:
  1. **Smoke test end-to-end** — correr 1 análise real + 1 pedido de relatório + verificar PDF gerado + email entregue. Sem isto, tudo o resto é fé.
  2. **Verificar domínio na Resend** + trocar `onboarding@resend.dev` por `relatorios@instabench.pt` (ou similar). Sem isto, ninguém recebe o relatório.
  3. **Validar `@react-pdf/renderer` no Cloudflare Worker** real (não preview). Se falhar, a alternativa é chamar um serviço HTTP externo de PDF — refactor médio.
  4. **AI insights reais via OpenAI** (`OPENAI_API_KEY` já configurada). Hoje o PDF não tem insights — só estrutura. Mas isto é melhoria, não bloqueador para validar pipeline.
  5. **EuPago — mínimo viável**: pay-by-link + webhook que reseta quota e deixa pedido entrar no mesmo pipeline. Só necessário quando o tier 3€ for ativado.
- **J. O que pausar?**
  - Pro / Agency / billing recorrente
  - Account deletion / GDPR self-service
  - Cookie consent platform
  - Quaisquer mais secções de landing
  - Refactor de RLS antes de haver auth de utilizador final

---

## 13) Recomendação final

**Readiness MVP estimado: 65%.**

A arquitetura está construída e coerente. O que falta é **prova empírica** dos pontos críticos (PDF no Worker + email não-sandbox + smoke test do pipeline). Sem isso, a percentagem real pode estar em qualquer ponto entre 35% e 75% — não há forma de saber sem correr.

**Caminho mais curto até MVP em 5 prompts**:

1. **Smoke test ao vivo** — gerar 1 análise real, 1 pedido, observar logs/BD, identificar onde quebra (sem código novo)
2. **Verificar domínio Resend + trocar sender** — micro-edição cirúrgica
3. **Resolver bloqueador #1 do smoke test** (provavelmente PDF runtime ou avatar fetch)
4. **Integração OpenAI para insights no PDF** — usa o secret já criado, só substitui o bloco `aiInsights` mock por dados gerados a partir do snapshot
5. **EuPago mínimo** — pay-by-link + webhook + reset de quota

**Recomendação**: **parar de adicionar scope** (subs, Pro, Agency, secções extra) e fazer **hardening + validação**. O produto tem mais código pronto do que tráfego validado. O próximo prompt útil é um smoke test guiado, não mais features.

