## Avaliação do estado atual

### a) Estão os custos bem ligados em Receitas/Despesas?

**Maioritariamente sim, mas com 3 inconsistências reais:**

✅ Já feito (de tasks anteriores):
- `aggregateCostsFromLogs` em `system-queries.server.ts` lê **directamente de `provider_call_logs`** e é fonte única para `/admin/sistema` (24h) e `/admin/receita` → `ExpenseSection` (30d).
- `ExpenseSection` faz `refetchInterval: 60_000` ms — ou seja, já é "near real-time".
- `report-cost-summary.server.ts` (custos por relatório no admin) **já aplica a regra correcta** `actual > 0 ? actual : estimated` (linha 146).

⚠️ Inconsistências por resolver:

1. **Regra desalinhada em `system-queries.server.ts`** (8 sítios): usa `actual_cost_usd ?? estimated_cost_usd`. Isto é **diferente** de `actual > 0 ? actual : estimated`. Como o Apify scraper grava `actual_cost_usd = 0.00000` (problema #3 do audit), o `??` aceita 0 como valor real e **descarta o estimated** → custo reportado = 0 quando devia ser ~estimated. Linhas 602, 698, 873, 877, 1070.

2. **`aggregateOpenAiActorBreakdown` (linha 216)** ignora `actual_cost_usd` por completo — só soma `estimated_cost_usd`. Quando o gateway começar a popular `actual_cost_usd`, este painel vai continuar a mostrar estimado.

3. **`fetchAvgCostPerReport` (linhas 873, 877)** só usa `estimated_cost_usd` ao calcular custo médio por análise fresh. Mesmo problema.

### b) Real-time já existe?

`refetchInterval: 60_000` no `ExpenseSection` — sim, é real-time aceitável (uma chamada a cada minuto). Não é preciso WebSockets para este painel.

---

## Plano de refinamento (cirúrgico)

### 1. Criar helper único — `src/lib/admin/cost-resolution.ts`

```ts
/**
 * Fonte única de verdade para resolver o custo de uma linha de
 * provider_call_logs. Regra: usa actual quando > 0, senão estimated.
 *
 * Porquê não `actual ?? estimated`: o Apify instagram-scraper grava
 * 0.00000 em vez de null, o que faria o `??` aceitar 0 como real e
 * descartar o estimated. O `> 0` garante fallback para estimated.
 */
export function resolveCallCost(row: {
  actual_cost_usd?: number | string | null;
  estimated_cost_usd?: number | string | null;
}): number {
  const actual = Number(row.actual_cost_usd ?? 0);
  if (actual > 0) return actual;
  const estimated = Number(row.estimated_cost_usd ?? 0);
  return estimated > 0 ? estimated : 0;
}
```

Com testes em `__tests__/cost-resolution.test.ts` cobrindo:
- actual > 0 → devolve actual
- actual = 0 e estimated > 0 → devolve estimated (caso Apify scraper)
- actual = null e estimated > 0 → devolve estimated (caso OpenAI hoje)
- ambos null/0 → 0
- string numérica vinda do Postgres numeric

### 2. Aplicar `resolveCallCost` em `system-queries.server.ts`

Substituir 8 sítios:

- **linha 216** `aggregateOpenAiActorBreakdown` → `acc.cost += resolveCallCost(row)`
- **linha 602** `aggregateCostsFromLogs` → `const cost = resolveCallCost(row)`
- **linha 698** `fetchRecentProviderCalls` → `cost: fmtCost(resolveCallCost(row))`
- **linhas 873, 877** `fetchAvgCostPerReport` → `resolveCallCost(call)`
- **linha 1070** `fetchCommentScraperMetrics` → `const cost = resolveCallCost(row)`

A lógica do `aggregateApifyActorBreakdown` (linhas 290-323) **mantém-se**: ali a separação `actualTotal` vs `estimatedTotal` é intencional para mostrar a coluna "fonte" no UI ("REAL" vs "ESTIM."). Só vou trocar o critério de "tem actual" de `!= null` para `> 0`, para que o scraper que grava 0 caia no balde estimated.

### 3. Aplicar `resolveCallCost` em `cost-sync.server.ts` (linhas 182, 283)

Mesma substituição. Garante consistência cron ↔ painel.

### 4. Confirmar refresh do `ReconciliationData`

`ExpenseSection` faz refetch de `expense-30d` mas não de `billing-reconciliation`. Adicionar `refetchInterval: 5 * 60_000` (5min) à query `recon` — mais lento porque consulta `provider_billing_imports` que muda apenas em imports manuais.

### Fora de escopo (deixar em `docs/future-tracking-cost-controls.md`)

- Fixar Apify scraper para gravar `null` em vez de `0` (mexe em provider — pediu para não tocar).
- OpenAI ler `x-cost-usd` do gateway e gravar `actual_cost_usd` — mexe em provider/lib insights.
- Phase 1/2/3 do audit anterior continuam pendentes; este plano só fecha **Phase 3 (unificar agregadores) + Phase 4 (real-time fallback)**.

### Validação

- `bunx tsc --noEmit`
- `bunx vitest run` (inclui novo teste de `cost-resolution`)
- Manual: abrir `/admin/receita`, comparar Apify total vs `select sum(...)` directo em `provider_call_logs` aplicando `actual>0?actual:estimated` para os últimos 30d. Devem bater.
- Manual: abrir `/admin/sistema` e confirmar que os totais 24h coincidem com a janela 24h de `/admin/receita`.

### Ficheiros alterados
- `src/lib/admin/cost-resolution.ts` (novo)
- `src/lib/admin/__tests__/cost-resolution.test.ts` (novo)
- `src/lib/admin/system-queries.server.ts` (8 substituições + 1 ajuste no Apify breakdown)
- `src/lib/admin/cost-sync.server.ts` (2 substituições)
- `src/components/admin/v2/visao-geral/expense-section.tsx` (1 linha — `refetchInterval` na query `recon`)
