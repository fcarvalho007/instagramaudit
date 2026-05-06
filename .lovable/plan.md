
## Problem

The "Estimativa por novo report" card shows **$0.01** because:

1. `analysis_events.estimated_cost_usd` only records **Apify scraping cost** (set via `estimateApifyCost`), ignoring OpenAI and DataForSEO costs
2. `fresh_total_spend_usd` sums only this partial Apify cost from `analysis_events`
3. The real per-report cost should include ALL provider calls: Apify profile+posts, Apify comments, OpenAI insights, OpenAI visual cover, DataForSEO

**Good news**: `provider_call_logs.analysis_event_id` already links provider calls to analysis events. We can compute accurate per-report cost by summing `provider_call_logs.estimated_cost_usd` grouped by `analysis_event_id`.

---

## Changes

### 1. Fix `fetchReportCounts` in `src/lib/admin/system-queries.server.ts`

Replace the current query that sums `analysis_events.estimated_cost_usd` (Apify-only) with:

- Query `provider_call_logs` grouped by `analysis_event_id` where the linked `analysis_event` has `data_source=fresh` and `outcome=success`
- Sum ALL provider costs per event (Apify + OpenAI + DataForSEO)
- Count distinct `analysis_event_id` as `fresh_full_reports_30d`
- Compute `fresh_avg_cost_per_report = total_provider_cost / fresh_full_reports_count`
- Add a `confidence` field: `"alta"` (>=20), `"media"` (5-19), `"baixa"` (<5 or missing grouping)

Updated return type adds:
```
fresh_avg_cost_per_report: number | null;
fresh_linked_provider_calls: number;
confidence: "alta" | "media" | "baixa";
```

### 2. Update `Expense30d` interface

Add the new fields to the exported type.

### 3. Redesign `ReportCostCards` in `expense-section.tsx`

Replace the 3 current cards with:

**Card 1 — "Custo médio histórico/report"**
- Value: `total_api_spend_30d / completed_reports_30d` (same as current `avgCost`)
- Sub: `"{n} reports gerados · inclui testes/cache · últimos 30 dias"`

**Card 2 — "Estimativa/report fresh"**
- Value: `fresh_avg_cost_per_report` if available, otherwise `"—"`
- Sub if reliable: `"{n} reports fresh · sem cache · últimos 30 dias"`
- Sub if not: `"Sem amostra fiável por report completo"`

**Card 3 — "Despesa acumulada"**
- Value: `total_api_spend_30d`
- Sub: `"Apify {x}% · OpenAI {y}% · DFS {z}%"`

**Card 4 — "Confiança da estimativa"**
- Value: `"Baixa"` / `"Média"` / `"Alta"`
- Rules: Alta >=20 fresh linked reports, Média 5-19, Baixa <5

### 4. Add tooltips to each card

- Historical: "Inclui todos os custos registados nos últimos 30 dias, incluindo testes e eventuais leituras em cache."
- Fresh estimate: "Custo real de todos os providers (Apify + OpenAI + DataForSEO) agrupados por report. Só é fiável com amostra suficiente."
- Accumulated: "Soma total dos custos de APIs registados no período."
- Confidence: "Baseado no número de reports fresh com custos agrupados por provider."

---

## Files changed

| File | Action |
|------|--------|
| `src/lib/admin/system-queries.server.ts` | Fix `fetchReportCounts` query + update `Expense30d` type |
| `src/components/admin/v2/visao-geral/expense-section.tsx` | Redesign `ReportCostCards` (4 cards + tooltips) |

## Not touched

P04, P05, P07, PDF pipeline, auth, global tokens, locked files, public report UI.

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run`
- Confirm `provider_call_logs` grouped by `analysis_event_id` includes all providers
- Confirm $0.01 value is replaced with accurate or explicitly unavailable estimate
