# Auditoria — Estado actual do InstaBench

Diagnóstico só-leitura. Nenhum ficheiro alterado.

---

## 1. Arquitectura e rotas principais

**Stack:** TanStack Start 1.x · React 19 · Vite 7 · Tailwind v4 · Supabase (Cloud) · Cloudflare Workers (`nodejs_compat`) · `@react-pdf/renderer` · Resend · Apify.

**Rotas de página (`src/routes/`):**
- `/` — landing
- `/analyze/$username` — dashboard público (SSR off, fetch só no browser, suporta `?vs=`)
- `/admin` — backoffice protegido por token
- `/design-system`, `/report.example` — internos
- `/privacidade`, `/termos` — legais

**Rotas server (`src/routes/api/`):**
- `analyze-public-v1` — boundary Apify (público, sem auth)
- `request-full-report` — gate freemium (público, sem auth)
- `generate-report-pdf` — render + upload (sem auth ⚠️)
- `send-report-email` — envio Resend (auth via `x-internal-token`)
- `admin/*` — `auth`, `logout`, `report-requests`, `report-requests.$id`, `regenerate-pdf`, `resend-email` (todos atrás de `requireAdminSession`)

---

## 2. Fluxo de análise Instagram

1. Browser chama `POST /api/analyze-public-v1` com `{ instagram_username, competitor_usernames[] }`.
2. Server valida com Zod (regex `^[A-Za-z0-9._]{1,30}$`), deduplica concorrentes (cap 2).
3. Constrói `cacheKey = v1:<primary>|<competitors-sorted>` e tenta `lookupSnapshot()` em `analysis_snapshots`.
4. Cache fresca (≤ 24 h) → devolve imediatamente com `data_source="cache"`.
5. Caso contrário, chama `apify/instagram-scraper` (uma chamada por handle, paralelo via `Promise.allSettled`-like).
6. Normaliza com `normalizeProfile` + `computeContentSummary`, persiste snapshot, calcula `benchmark_positioning` server-side.
7. **Resilência stale-while-error:** se o Apify falhar mas houver snapshot ≤ 7 dias, devolve com `data_source="stale"`.
8. Erros mapeiam para 5 códigos (`INVALID_USERNAME`, `PROFILE_NOT_FOUND`, `UPSTREAM_UNAVAILABLE`, `UPSTREAM_FAILED`, `NETWORK_ERROR`) com mensagens em pt-PT.

Escape hatch `?refresh=1` força refetch (não exposto na UI).

---

## 3. Dependência Apify

- Único ator: `apify/instagram-scraper` (unificado — antes eram 2).
- Endpoint: `run-sync-get-dataset-items` (síncrono, sem polling).
- Token via `Authorization: Bearer` (não na query string — boa prática já aplicada na PR2 anterior).
- Timeouts: 60 s wall-clock, 55 s Apify-side, 1024 MB.
- **Bloqueio conhecido:** plano Creator não permite Public Actors. Necessário Starter+ para o pipeline completar end-to-end. Nenhum dado real em `analysis_snapshots` (0 linhas) confirma isto.

---

## 4. Tabelas Supabase

Quatro tabelas, todas com RLS **activo mas sem policies** (linter confirma 4 avisos INFO). Acesso é exclusivamente via `supabaseAdmin` (service-role) em rotas server.

| Tabela | Uso | Linhas |
|---|---|---|
| `analysis_snapshots` | Cache 24 h dos resultados Apify; chave única `cache_key` | 0 |
| `benchmark_references` | Dataset de referência (engagement por tier × formato) | 15 |
| `leads` | Upsert por `email_normalized` na gate do relatório | 0 |
| `report_requests` | Pedido de relatório completo; tracking de PDF + email | 0 |

Sem foreign keys formais entre `report_requests.lead_id` e `leads.id` (validação só ao nível aplicação).

---

## 5. Geração de PDF

- Disparada por `runReportPipeline` (background, fire-and-forget) após insert em `report_requests`.
- `POST /api/generate-report-pdf` (idempotente; `force=true` regenera):
  1. Lê `report_requests` → `analysis_snapshot_id` → `analysis_snapshots.normalized_payload`.
  2. Valida shape com `isNormalizedPayload`.
  3. Marca `pdf_status='generating'`.
  4. Renderiza com `@react-pdf/renderer` (compatível com Workers via `nodejs_compat`).
  5. Faz upload para bucket privado `report-pdfs` em path determinístico.
  6. Marca `pdf_status='ready'` com `pdf_storage_path` + `pdf_generated_at`.
- Falhas → `pdf_status='failed'` + `pdf_error_message` curto.
- **Risco:** rota não tem auth — qualquer pessoa com um `report_request_id` pode disparar regeneração.

---

## 6. Envio de email

- `POST /api/send-report-email`, autenticado por `x-internal-token` (constant-time não, mas comparação simples).
- Resolve lead → `createSignedUrl` (TTL 7 dias) no bucket → constrói HTML/texto → `fetch` Resend (timeout 10 s).
- **Optimistic lock:** UPDATE atómico para `delivery_status='sending'` evita duplo envio concorrente.
- Tracking: `delivery_status`, `email_sent_at`, `email_message_id`, `email_error_message`.
- Detecta explicitamente `RESEND_SANDBOX_RECIPIENT_BLOCKED`.
- **Bloqueio actual:** sender é `onboarding@resend.dev` (sandbox). Só entrega ao dono da conta Resend até verificar domínio próprio.

---

## 7. Fluxo admin

- `/admin` mostra `<AdminGate>` que faz `POST /api/admin/auth` com o token.
- Server compara em tempo constante contra `INTERNAL_API_TOKEN` e cria sessão via `useSession` do TanStack Start (cookie httpOnly, SameSite=Lax, Secure em prod, max-age 8 h).
- Password da sessão = `INTERNAL_API_TOKEN` + sufixo determinístico → rotação do token invalida sessões.
- `requireAdminSession()` no topo de cada rota `/api/admin/*`.
- Capacidades: listar/filtrar `report_requests` (paginado, search por username ou email), ver detalhe, regenerar PDF, reenviar email.

---

## 8. `.env` e variáveis sensíveis

- `.env` existe localmente em `/dev-server/.env` (642 B) mas está **explicitamente listado em `.gitignore`** e **não aparece em `git ls-files`** → não está commitado.
- `.env` contém apenas chaves públicas (anon key, URL Supabase, project ID) — todas já visíveis no bundle do cliente, sem risco.
- Secrets reais (`APIFY_TOKEN`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `INTERNAL_API_TOKEN`, `LOVABLE_API_KEY`, `OPENAI_API_KEY`) estão em Lovable Cloud secrets, lidos via `process.env` em runtime server. ✅

---

## 9. Riscos de segurança

| # | Risco | Severidade |
|---|---|---|
| S1 | `POST /api/generate-report-pdf` sem auth nem rate-limit. Atacante pode forçar regenerações em massa (custo + load). | **Alta** |
| S2 | `POST /api/request-full-report` sem rate-limit. Atacante pode floodar `leads` (1 row por email novo) e queimar quota Apify. | **Alta** |
| S3 | `POST /api/analyze-public-v1` sem rate-limit nem CAPTCHA. Cada miss = chamada Apify paga; varredura de usernames é trivial. | **Alta** |
| S4 | RLS activo mas zero policies em todas as 4 tabelas. Funciona porque tudo passa por service-role; mas se algum dia uma rota usar o cliente browser autenticado, falha silenciosamente. | Média (latente) |
| S5 | `analysis_snapshot_id` na payload da gate é confiável só por validação de username (case-insensitive). Atacante pode forjar pares (snapshot, username) válidos para vincular um pedido a um snapshot que não viu. | Baixa |
| S6 | Sem CSRF em rotas POST públicas (`/api/admin/auth` é mitigado por SameSite=Lax + token, mas uma rota `/api/admin/*` adicional sem `requireAdminSession` seria explorável). | Baixa |
| S7 | Logs imprimem `instagram_username`, e errors do Resend incluem 300 chars do response — risco baixo de leak de email do destinatário em logs. | Info |

---

## 10. Riscos de produto

| # | Risco | Impacto |
|---|---|---|
| P1 | **Zero dados reais em produção** (0 snapshots, 0 leads, 0 requests). Pipeline E2E nunca completou — provável bloqueio Apify (Creator) + Resend (sandbox). | Crítico — produto não foi validado em condições reais. |
| P2 | Sem domínio Resend verificado → emails só chegam ao dono da conta. Conversion rate efectivo do gate é 0 % para qualquer outro destinatário. | Alto |
| P3 | Sem feedback ao utilizador entre o "pedido aceite" e o email chegar (60–90 s). Falhas silenciosas (`failed_pdf`, `failed_email`) ficam só na DB. | Alto |
| P4 | `Premium Locked` no dashboard usa valores hardcoded (a confirmar em `premium-locked-section.tsx`). Quebra credibilidade quando comparado com métricas reais ao lado. | Médio-Alto |
| P5 | Quota mensal não tem mecanismo anti-fraude por email descartável (`+alias`, mailinator, etc.). | Médio |
| P6 | Cache 24 h é agressivo para perfis muito activos; sem botão "Atualizar análise" exposto na UI. | Médio |
| P7 | Sem analytics/observabilidade (sem Sentry/PostHog). Não há como detectar drops de conversão ou erros do utilizador. | Médio |
| P8 | `report_requests.lead_id` sem FK formal → se um lead for apagado, registos ficam órfãos. | Baixo |

---

## 11. Próximos 5 passos recomendados (por prioridade)

1. **Domínio Resend verificado (P2)** — bloqueador absoluto para entrega real. Configurar DNS, atualizar `SENDER_FROM` em `send-report-email.ts`. Sem isto, nada do funil freemium funciona para utilizadores externos.
2. **Auth + rate-limit nas rotas públicas (S1, S2, S3)** — `generate-report-pdf` deve passar a exigir `x-internal-token` (ou cookie admin). `analyze-public-v1` e `request-full-report` precisam de rate-limit por IP (ex.: 10 req/min, 50 req/dia) e idealmente Turnstile/hCaptcha invisível na gate. Custo Apify e DB protegidos.
3. **Página de status do relatório + polling (P3)** — rota `/relatorio/$requestId` com polling ao `request_status` para mostrar "A gerar… → A enviar… → Concluído / Falhou". Inclui caminho de download direto via signed URL como fallback ao email.
4. **Substituir teasers hardcoded por dados reais do snapshot (P4)** — auditar `premium-locked-section.tsx` e ligar os valores ao `normalized_payload` (com blur/lock visual). Mantém o gate, ganha credibilidade.
5. **Smoke test E2E + observabilidade mínima (P1, P7)** — depois de 1 e 2, fazer um pedido real de ponta-a-ponta com perfil próprio + email próprio, e adicionar logging estruturado (timestamps, request_id) nas 4 rotas críticas. Idealmente Sentry para captura de erros server.

---

## 12. Ficheiros bloqueados (não editar sem permissão explícita)

Listados em `.lovable/memory/constraints/locked-files.md`:

- **Foundation:** `/src/styles/tokens.css`, `/src/styles.css` (bloco `@theme inline`), `/src/routes/__root.tsx`, `/LOCKED_FILES.md`
- **UI primitives:** `button`, `badge`, `card`, `input`, `switch`
- **Layout:** `container`, `header`, `footer`, `app-shell`, `brand-mark`
- **Landing (Sprint 1):** `hero-section`, `hero-aurora-background`, `hero-action-bar`, `use-in-view`, `social-proof-section`, `how-it-works-step`, `how-it-works-section`, `mockup-metric-card`, `mockup-benchmark-gauge`, `mockup-dashboard`, `product-preview-section`, `blur-reveal-text`, `animated-counter`, `handwritten-note`, `scroll-indicator`, `instagram-glyph`
- **Report:** `/src/styles/tokens-light.css`, todos os componentes em `/src/components/report/*`, `/src/routes/report.example.tsx`
- **Legal:** `/src/components/legal/legal-layout.tsx`, `/src/routes/privacidade.tsx`, `/src/routes/termos.tsx`

**Auto-geridos pela plataforma (nunca editar manualmente):**
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `src/routeTree.gen.ts`
- `.env`

---

## Checkpoint

- ☑ Arquitectura, rotas, fluxos e tabelas auditados
- ☑ `.env` confirmado fora do git
- ☑ 7 riscos de segurança identificados
- ☑ 8 riscos de produto identificados
- ☑ 5 próximos passos priorizados
- ☑ Lista de ficheiros bloqueados consolidada
- ☐ Decidir qual dos 5 passos avançar primeiro
