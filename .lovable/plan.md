## Re-avaliação — o que ficou por fazer

Após a última iteração (helper `resolveCallCost` aplicado em `system-queries.server.ts` + `cost-sync.server.ts`), restou **um foco crítico não convertido**: a tabela de **Reconciliação interno vs externo** em `/admin/receita` (alimentada pelo endpoint `/api/admin/billing-reconciliation`).

### Inconsistência confirmada

`src/lib/admin/billing-reconciliation.server.ts` lê `provider_call_logs` mas usa **apenas `estimated_cost_usd`** para o lado "interno", em 5 sítios (linhas 87, 117, 140, 156, 200, 223). Resultado:

- Zona "CUSTO INTERNO ATRIBUÍDO" (já corrigida): mostra `resolveCallCost` (actual quando >0, senão estimated)
- Zona "RECONCILIAÇÃO" (atual): mostra só `estimated_cost_usd`
- → As duas zonas no **mesmo ecrã** mostram totais internos diferentes para a mesma janela. O user acaba a duvidar de qual é "o real".

### Locais fora de escopo (deliberadamente não tocar)

- `src/lib/admin/alerts.ts:294` e `src/routes/api/admin/diagnostics.ts:161` — lêem de `analysis_events`, tabela que **só tem `estimated_cost_usd`** (não tem `actual`). Regra não se aplica.
- `provider_billing_imports.actual_cost_usd` (linhas 134, 190 do billing-recon) — é o lado **externo** (faturação real do dashboard do provider), por design só tem `actual`. Mantém-se.

---

## Plano final

### Patch único — `src/lib/admin/billing-reconciliation.server.ts`

1. Importar `resolveCallCost` no topo.
2. Mudar o `.select(...)` da linha 87 de `"provider, actor, estimated_cost_usd, created_at"` para incluir `actual_cost_usd`:
   ```ts
   .select("provider, actor, actual_cost_usd, estimated_cost_usd, created_at")
   ```
3. Substituir as 5 ocorrências de `Number(r.estimated_cost_usd ?? 0)` aplicadas a linhas de `provider_call_logs` por `resolveCallCost(r)`:
   - linha 117 (`internalTotal` KPI)
   - linha 140 (`daily.internal`)
   - linha 156 (`provMap` por provider)
   - linha 200 (`actorMap` por actor)
   - linha 223 (loop de batches → `intTotal`)

Não tocar nas linhas 104, 134, 190, 232 — essas são do lado **externo** (`provider_billing_imports` / `provider_billing_import_batches`), onde `actual_cost_usd` representa faturação real do dashboard do provider e não há fallback para estimated.

### Validação

- `bunx vitest run` — toda a suite (helper já tem 7 testes que cobrem a regra).
- Manual em `/admin/receita`:
  1. Anotar "Total interno atribuído" da zona 1 (Apify + OpenAI + DFS soma).
  2. Anotar "Interno registado" da zona 3 (Reconciliação) — agora deve coincidir com (1) para o mesmo período de 30d. Antes desta correção, divergiam quando há `actual_cost_usd > 0` em qualquer linha.

### Ficheiros alterados
- `src/lib/admin/billing-reconciliation.server.ts` (1 import + 1 select + 5 substituições)

Sem mudanças de schema, sem novas migrações, sem mexer em providers.
