# Final Consolidation Audit — Plano de Execução

Auditoria **100% read-only** ao MVP beta antes de convidar testers reais. Sem alterações de código, sem chamadas a providers, sem mutações de DB.

---

## Objetivo

Produzir um relatório único de 10 secções (executive summary → batches de implementação) que confirme que o beta está pronto para os primeiros utilizadores externos, **ou** identifique exatamente o que falta corrigir antes.

---

## Fases da auditoria

### Fase 1 — Reconhecimento estático (rg + code--view)

Mapear, sem ler ficheiros inteiros, **onde está cada coisa** para cruzar com a lista do utilizador:

- **Eventos:** `rg "recordProductEvent\(|trackEvent\(" -n src/` → todos os call sites com linha e contexto, agrupar por `event_type`.
- **Allowlist:** ler `src/lib/tracking.functions.ts` (já sabemos que está limpa após P0-B).
- **Lifecycle:** ler `src/lib/admin/lead-lifecycle.ts` para ver mapeamento `event_type → commercial_status` e confirmar que **não** referencia eventos obsoletos (`feedback_request_sent`, `pro_teaser_clicked`, `email_clicked`).
- **Email templates:** `ls src/lib/email/templates/` + `rg "from.*email/templates" -n src/` → confirmar quem importa o quê (orfãos identificados na auditoria anterior: `commercial-followup` ainda órfão).
- **Endpoints de envio:** `rg -n "Resend|resend\.emails\.send|RESEND_API_KEY" src/` → confirmar gates `INTERNAL_API_TOKEN` e kill-switch.
- **Provider gates:** `rg -n "APIFY_ENABLED|OPENAI_ENABLED|DATAFORSEO_ENABLED" src/` → confirmar leitura em todos os providers.
- **Public routes:** `ls src/routes/` + `rg -n "createServerFn|requireSupabaseAuth|INTERNAL_API_TOKEN" src/routes/analyze* src/routes/feedback* src/routes/api/public/` → confirmar nenhuma rota pública dispara provider pago.
- **Variants do paywall:** `rg -n "unlock_clicked|pricing_option_clicked|paywall|locked" src/components/report*` para confirmar que disparam uma única vez com metadata útil.

### Fase 2 — Tracing end-to-end do happy path

Para cada um dos 16 passos do lifecycle indicados pelo utilizador, identificar:
- ficheiro + função que despoleta
- evento que regista
- transição de status que espera disparar (cruzar com `lead-lifecycle.ts`)
- label da timeline (cruzar com `lead-detail-sheet.tsx`)
- metadata mínima registada

Output: tabela com 16 linhas e coluna "✅ confirmado / ⚠️ parcial / ❌ em falta".

### Fase 3 — Verificações de DB (read-only)

Apenas `SELECT` via `supabase--read_query`. Cinco queries estritamente diagnósticas:

1. **Distribuição de `commercial_status`** em `leads` — detetar leads "presos" em estados intermédios.
2. **Distribuição de `event_type`** em `product_events` (últimos 30d) — confirmar que só aparecem eventos da allowlist atual e detetar eventos obsoletos persistidos historicamente.
3. **Leads com `report_link_sent` mas sem `report_viewed`** após 7d — sinal de relatórios entregues mas não abertos.
4. **`report_requests` com `delivery_status='sent'` sem evento `report_link_sent`** — gap de backfill.
5. **`beta_feedback` órfão** (sem `report_request` correspondente) ou inconsistente (`lead_id` ≠ `report_request.lead_id`).

### Fase 4 — Validação automática

- `bunx tsc --noEmit` (esperar 0 erros).
- `bunx vitest run` (esperar 163/163 ou superior — P1-A trará +4–6).
- `supabase--linter` (esperar 0 critical, deve corresponder ao output da auditoria anterior).

### Fase 5 — Síntese do relatório

Documento único de 10 secções na resposta final ao utilizador:

1. **Executive summary** (≤8 linhas).
2. **Beta readiness score** 0–100, com delta vs. score anterior (78).
3. **P0 blockers** (lista vazia se OK para beta).
4. **P1 fixes** antes dos primeiros testers externos.
5. **P2 fixes** após primeira vaga.
6. **Orphan/duplicate code list** (cruzar com auditoria anterior — atualizar status).
7. **Event consistency table** — 12 eventos × colunas {emitido, allowed, lifecycle handler, timeline label, metadata, obsoleto?}.
8. **Email wiring table** — 4 fluxos × {template usado, endpoint, gate, status}.
9. **Provider safety table** — 4 providers × {kill-switch, allowlist, public path?, admin path?}.
10. **Recommended implementation batches** — atualização do roadmap P0–P3 com qualquer item novo.

---

## Restrições enforced durante a execução

| Não fazer | Como garanto |
|---|---|
| Alterar código | Sem `code--apply_patch`, `code--write`, `code--copy` para src/, `supabase--migration`, `supabase--insert` |
| Enviar emails | Não invocar `send-report-link`, `send-feedback-request`, nem nenhum endpoint Resend |
| Gerar relatórios | Não invocar `analyze.functions` nem refresh |
| Chamar providers | Não invocar `stack_modern--invoke-server-function` em endpoints com Apify/OpenAI/DataForSEO/Resend |
| Mutar DB | Apenas `supabase--read_query`, nunca `supabase--insert` ou `supabase--migration` |

## Tools usadas (todas read-only)

- `code--exec` (apenas `rg`, `ls`, `bunx tsc --noEmit`, `bunx vitest run`)
- `code--view`, `code--list_dir`
- `supabase--read_query`, `supabase--linter`

## Estimativa de duração

~6–10 chamadas de tool em paralelo agressivo. Resultado consolidado num único turno de resposta ao utilizador.

---

## O que **não** está incluído (por design)

- Não importa código do CRM Webinar (roadmap separado).
- Não implementa nenhum batch P0/P1/P2 do roadmap anterior — só audita o estado atual.
- Não faz refactor preventivo nem renames.
- Não cria testes novos — só relata cobertura atual e gaps.

Aprova para eu correr a auditoria.
