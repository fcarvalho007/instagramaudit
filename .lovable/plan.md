
## Current State

**Confidence formula (before):**
- Alta: `freshCompleteReports >= 20`
- Media: `freshCompleteReports >= 5`
- Baixa: otherwise
- `freshCompleteReports` = events with `providers.size >= 1` (any single linked call counts)
- No linkage rate check — confidence is purely sample-size based

**Expense30d fields (before):**
Already has `fresh_total_provider_calls`, `fresh_calls_with_event_id`, `fresh_linked_reports`, but no per-provider linkage breakdown.

## Changes

### 1. Backend: `system-queries.server.ts`

**Add to `Expense30d` interface:**
```
provider_calls_total_30d: number
provider_calls_linked_30d: number
provider_calls_unlinked_30d: number
provider_linkage_rate_pct: number
provider_linkage_by_provider: {
  provider: string
  total: number
  linked: number
}[]
```

**Compute per-provider linkage** from the existing `provider_call_logs` query (30d, status=success), grouped by provider, partitioned by `analysis_event_id IS NOT NULL`.

**New confidence formula (after):**
```
linkage_rate = provider_calls_linked_30d / provider_calls_total_30d * 100

Alta:  freshCompleteReports >= 20 AND linkage_rate >= 95
Media: freshCompleteReports >= 5  AND linkage_rate >= 85
Baixa: otherwise
```

**Populate new fields** from counts already queried (reuse `freshTotalProviderCalls` / `freshCallsWithEventId` as `provider_calls_total_30d` / `provider_calls_linked_30d`).

### 2. UI: `expense-section.tsx` — ReportCostCards

**Card 1 — "Custo médio histórico/report"**: unchanged.

**Card 2 — "Estimativa/report fresh"**: add warning sub-text when confidence is "baixa":
> "Estimativa em validacao — alguns custos podem ainda nao estar atribuidos ao report."

**Card 3 — "Despesa acumulada"**: unchanged.

**Card 4 — "Confianca da atribuicao"**: replace current sub with:
- Primary: linkage percentage + "X/Y chamadas ligadas"
- Secondary line: per-provider breakdown (compact, e.g. "Apify 3/3 · OpenAI 5/8 · DFS 2/2")

### 3. Validation

- `bunx tsc --noEmit`
- `bunx vitest run`

### Files changed

- `src/lib/admin/system-queries.server.ts` — new fields + confidence formula
- `src/components/admin/v2/visao-geral/expense-section.tsx` — updated ReportCostCards

### What will NOT change

P01-P07 report UI, public pages, provider execution logic, pricing formulas, cache/fresh execution mode, PDF pipeline, auth/admin permissions.
