## Diagnóstico

O fluxo escreve correctamente para `leads`, `lead_payments`, `credit_ledger`, `lead_entitlements` e `product_events`. O problema está **só na camada de leitura do /admin**: 6 campos já gravados nunca chegam ao ecrã, 3 valores são hardcoded em vez de calculados, e um endpoint pronto (`/api/admin/onboarding-funnel`) não está ligado a lado nenhum.

Não é preciso migração nem mexer em start.ts / claim-existing.ts / eupago-webhook.ts — escrita está correcta. Tudo abaixo é UI + leitura.

---

## Fix 1 — `LeadDetailSheet` › tab **Resumo**: expor campos do modal/contexto

`src/components/admin/v2/beta-leads/lead-detail-sheet.tsx`

Adicionar (lendo do `EnrichedLead` que já transporta os valores via `getLeadsKanbanSnapshot`):
- **`qualification`** (derivado em `build-start-payload.ts`) — chip ao lado de `profile_ownership` no resumo, com label PT (`labelQualification`). Hoje não aparece em parte nenhuma.
- **`email_domain_class`** — chip discreto junto ao email (`corporate` / `personal` / `disposable` / `unknown`).
- **`phone`** — linha "Telemóvel" abaixo do email (já está em `EnrichedLead.phone`, só não é renderizado).
- **`gdpr_consent_at` + `gdpr_consent_version`** — uma linha rodapé tipo "Consentimento RGPD v1 · 9 jun 2026 14:30".
- **`marketing_consent_at`** — chip "Aceita marketing" só se `true`, com data em tooltip.
- **`source`** — já presente, mas mapear `otp_claim` → "Conta reentrou (OTP)" e `onboarding_modal` → "Novo via onboarding" em vez de mostrar o slug cru.

Adicionar `labelQualification` e `labelEmailDomainClass` em `src/lib/admin/v2/beta-leads/labels.ts` (ou onde os outros `labelXxx` vivem) — sempre via dicionário, sem hardcoded strings nos componentes.

---

## Fix 2 — KPI "Relatórios" no LeadDetailSheet deixa de ser `"1"` ou `"0"`

`src/components/admin/v2/beta-leads/lead-detail-sheet.tsx:761`

Hoje:
```
const kpiReports = lead.report_request_id ? "1" : "0"
```

Substituir por contagem real (`lead.reports_count` ou `lead.report_views`). O `getLeadsKanbanSnapshot` já calcula `report_views` por handle a partir de `product_events`; basta:
1. Adicionar `reports_count: number` ao tipo `EnrichedLead`, derivado de `count(report_requests where lead_id = ?)` na mesma query/loop que já cruza `report_requests`.
2. Usar `kpiReports = String(lead.reports_count)`.

Sem hardcoded, sem mock.

---

## Fix 3 — Tab **Pagamentos** do LeadDetailSheet expõe metadata do checkout

A informação rica está em `lead_payments.metadata` mas o admin só mostra status/valor.

Renderizar, para cada `lead_payment`:
- **`metadata.qualification`** (objectivo + contexto declarados *no momento do checkout*, podem diferir do onboarding).
- **`metadata.report_goals`** (array até 4) — não só `report_priority`.
- **`metadata.billing`** — bloco colapsado "Dados de facturação" com nome, NIF, morada, CP, cidade, email de fatura. Em falta → não renderiza o bloco.
- **`metadata.upsell_from` / `upsell_to` / `upsell_accepted`** — chip "Upsell aceite: pack 9 → pack 19" quando aplicável.

Cada item lê directo do JSONB, com fallbacks vazios (sem strings hardcoded "—" no JSX; usar helper `formatBillingBlock(metadata.billing)` que devolve `null` quando vazio).

---

## Fix 4 — `PaymentsSection` em `/admin/receita` ganha colunas derivadas reais

`src/components/admin/v2/receita/payments-section.tsx`

Adicionar à tabela de pagamentos (todas vêm de `lead_payments.metadata`, zero hardcode):
- **Objectivo principal** (`metadata.primary_goal`).
- **Upsell** (badge: presented/accepted/from→to).
- **Cupão** (`metadata.coupon_code` + `metadata.discount_percent` em chip).

Servidor: alargar o `select` em `/api/admin/payments-snapshot` (ou equivalente) para incluir a `metadata` (já vem de `lead_payments` via `select *`, confirmar).

---

## Fix 5 — Funil de onboarding 7d: ligar o endpoint que já existe

`src/routes/api/admin/onboarding-funnel.ts` devolve `step_view / success / abandon / errors` mas nenhuma página o consome.

Plano:
1. Criar `src/components/admin/v2/visao-geral/onboarding-funnel-card.tsx` que faz `useQuery` ao endpoint e renderiza as 3 etapas (entry → qualification → final) com taxa de conclusão e erros.
2. Inserir o card em `/admin/visao-geral`, **abaixo** do `AcquisitionFunnel` existente (o AcquisitionFunnel mede aquisição macro; este mede *qualidade do modal*).
3. Nada de hardcoded; se o endpoint devolver array vazio, mostrar empty state "Sem actividade nos últimos 7 dias".

---

## Fix 6 — `AcquisitionFunnel` › remover hardcode "sem tracker"

`src/components/admin/v2/visao-geral/acquisition-funnel.tsx:107-111`

Hoje a etapa "Report público visto" está fixa em `count: 0, note: "sem tracker", unavailable: true`. Duas opções, ambas sem hardcode:

**Opção A (preferida — implementar o tracker em falta).** Disparar `product_events.event_type = "public_report_view"` no carregamento da rota pública de report (`src/routes/analyze.$username.tsx` ou equivalente do "share view"), via call lightweight a `/api/public/track-event` (já existe família `product_events`). O endpoint do funil passa a contar este evento.

**Opção B (cortar a etapa).** Se a equipa decidir não trackear isto agora, **remover** a linha do array em vez de a deixar fixa em 0. Mostrar 0 com nota "sem tracker" induz erro de leitura nas reviews.

Recomendado: **A**. É 1 evento, 1 route handler `/api/public/track-event` que aceita `{ event_type, handle }` e escreve em `product_events` com `supabaseAdmin`.

---

## Fix 7 — `AcquisitionFunnel` › "Convertido (pago)" deixa de depender de `revenueActive`

Mesmo ficheiro, linhas 116–124.

Hoje, se `revenueActive=false` (flag dos KPIs), a etapa fica em 0 com nota "checkout por ligar" *mesmo que `lead_payments` tenha pagos*. Substituir pela contagem real `SELECT count(*) FROM lead_payments WHERE status='paid' AND created_at >= now()-interval '7 days'` que o endpoint do funil já consegue calcular. A flag `revenueActive` pode continuar a controlar copy informativa, mas o número tem de vir de dados.

---

## Fix 8 — Limpeza de `mock-data.ts`

`src/lib/admin/mock-data.ts` tem 40+ constantes mock; só `DAILY_COST_LIMIT` e `MockReportDetail` são importados.

Acção mínima e segura:
- Mover `DAILY_COST_LIMIT` para `src/lib/admin/config.ts` (constante de configuração, não mock).
- Mover `MockReportDetail` para junto do `error-investigation-modal` como fixture de dev (sufixo `.fixtures.ts`).
- Apagar o resto. Reduz risco de alguém usar mocks por engano em produção.

---

## Não-mexer

- `start.ts`, `claim-existing.ts`, `check-email.ts`, webhook EuPago, `createEupagoCheckout` — escrita está correcta e segura.
- Schemas Zod do servidor.
- `OnboardingModal` em si (UI do utilizador final).
- Tabelas / migrações — toda a informação já existe na BD.

---

## Ordem de execução sugerida

1. **Fix 2** (kpiReports real) — 1 ficheiro, risco zero.
2. **Fix 1** (expor 6 campos no Resumo) — UI-only, alarga `EnrichedLead` projection.
3. **Fix 3 + 4** (metadata de checkout no admin) — UI + alargar select.
4. **Fix 6A** (tracker `public_report_view`) — 1 route + 1 call no client.
5. **Fix 7** (funil convertido = contagem real) — endpoint + componente.
6. **Fix 5** (ligar onboarding-funnel card) — 1 componente novo + 1 import na página.
7. **Fix 8** (limpeza mock-data) — por último, baixo risco mas mexe em vários ficheiros.

---

## Testes

- Snapshot do `LeadDetailSheet` com lead que tem todos os campos (qualification, phone, billing) → confirmar render.
- Snapshot com lead minimalista (só email+gdpr) → confirmar que blocos opcionais não renderizam vazios.
- Unit test ao novo helper `formatBillingBlock(metadata.billing)`.
- `onboarding-funnel.ts` já tem testes; adicionar caso para `paid` 7d.
- Tracker `public_report_view`: smoke test que confirma POST + linha em `product_events`.

---

## Risco residual

- A passagem de `revenueActive` a número-real (Fix 7) pode expor pagamentos antigos que estavam escondidos atrás do gate — confirmar com a equipa se isso é desejado (assumimos que sim, é o ponto da auditoria).
- Adicionar `report_views` por lead aumenta marginalmente o custo da query do kanban (1 join extra com `product_events`). Mitigar com índice em `product_events(lead_id, event_type)` se faltar.