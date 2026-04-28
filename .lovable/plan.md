## Goal

Make `/admin` financially honest. Per snapshot, show what each provider really cost (Apify, DataForSEO, OpenAI), with a clear cost-source label so estimated values are never presented as confirmed.

No provider is called. No schema migration. No /report/example or public report design changes.

## Files

**Create**
- `src/lib/admin/report-cost-summary.server.ts` — server-only aggregator. Pure logic + a Supabase reader. Three exports:
  - `classifyCostSource(...)` — pure, returns `"provider_reported" | "estimated" | "calculated" | "cache_hit" | "not_used"`.
  - `summarizeCallLogs(rows)` — pure, groups raw `provider_call_logs` rows by provider, totals, classifies, and produces a per-provider summary + a single overall confidence (`"confirmado" | "parcial" | "estimado" | "sem_custos"`).
  - `fetchReportCostSummary({ snapshotId, instagramUsername, snapshotCreatedAt, snapshotUpdatedAt })` — queries `provider_call_logs` for that handle inside the snapshot's time window (created_at − 60s ≤ row.created_at ≤ updated_at + 60s) and runs `summarizeCallLogs`.

- `src/lib/admin/cost-source-labels.ts` — pt-PT labels for cost-source and confidence. Pure, client-safe.

**Edit**
- `src/routes/api/admin/reports.ts`
  - For each active snapshot, fetch a single grouped `provider_call_logs` query for all returned handles in the same time window (one query, not N), then attach a compact `cost_summary` per row.
  - The new field is added to `ReportRow` shape:
    ```ts
    cost_summary: {
      apify:      { actual_usd: number|null; estimated_usd: number; source: CostSource; calls: number; }
      dataforseo: { actual_usd: number|null; estimated_usd: number; source: CostSource; calls: number; }
      openai:     { actual_usd: number|null; estimated_usd: number; source: CostSource; calls: number; }
      total_actual_usd: number;     // sum of *known* actual values (provider_reported only)
      total_estimated_usd: number;  // sum across providers
      confidence: "confirmado" | "parcial" | "estimado" | "sem_custos";
    }
    ```

- `src/routes/api/admin/snapshot-by-id.$snapshotId.ts`
  - Add `cost_summary` (same shape as above) plus a `provider_calls` array with the raw rows the preview needs:
    ```ts
    provider_calls: Array<{
      id: string; provider: string; actor: string; handle: string;
      status: string; http_status: number|null;
      actual_cost_usd: number|null; estimated_cost_usd: number|null;
      cost_source: CostSource;
      duration_ms: number|null; created_at: string;
    }>
    ```
  - Limit to last 100 rows for that snapshot's window. Sorted DESC by `created_at`.

- `src/components/admin/cockpit/panels/reports-panel.tsx`
  - Add 2 columns to the table:
    - **Custo (real)** — `formatCost(total_actual_usd)`; em mono.
    - **Confiança** — badge with one of `Confirmado / Parcial / Estimado / Sem custos externos`.
  - Type `ReportRow` extended with `cost_summary`.
  - For OpenAI source `not_used`, the per-row total simply omits OpenAI from the display; total_actual stays accurate.

- `src/routes/admin.report-preview.snapshot.$snapshotId.tsx`
  - Add a new section between `CoverageNotice` and `AdminFooterNotice`:
    - `<CostBreakdownPanel summary={…} calls={…} />` — server data already arrives in `body.snapshot`.
  - Extend `SnapshotResponse` with `cost_summary` + `provider_calls` (typed inline; no shared type leak across server boundary).

**Create**
- `src/components/admin/cockpit/parts/cost-breakdown-panel.tsx` — client component. Two parts:
  1. Small grid of provider cards (Apify, DataForSEO, OpenAI) with actual/estimated and source badge.
  2. `DataTable` of provider calls (operação=actor, estado, custo real, custo estimado, fonte, duração, criado).
  Reuses `formatCost`, `formatDate`, `formatDuration`, `providerStatusLabel`. No new design tokens.

**Untouched**
- `/report/example`, all public report visuals, `provider_call_logs` schema, `analysis_events` schema, `analysis_snapshots` schema, billing.

## Cost classification rules (single source of truth in `classifyCostSource`)

For one provider's set of rows that match the snapshot window:

| Condition | source | actual_usd | estimated_usd |
|---|---|---|---|
| 0 rows AND provider expected for this snapshot | `cache_hit` | null | 0 |
| 0 rows AND provider not part of pipeline (e.g. OpenAI today) | `not_used` | null | 0 |
| ≥1 row, all blocked / 0 cost (`status='blocked'` or all `actual_cost_usd=0` AND `estimated_cost_usd=0`) | `cache_hit` | null | 0 |
| ≥1 row with `actual_cost_usd > 0` | `provider_reported` | sum(actual) | sum(estimated) |
| ≥1 row, no `actual_cost_usd > 0`, but ≥1 `estimated_cost_usd > 0` | `estimated` | null | sum(estimated) |
| Provider is OpenAI AND any token-based metric exists | `calculated` | sum | sum estimated |  *(future-ready; currently unreachable since OpenAI rows don't exist yet)*

"Provider expected" rule v1:
- `apify` → always expected (every snapshot was created from Apify or its cache).
- `dataforseo` → expected only when `normalized_payload.market_signals_free` exists OR `market_signals_paid` exists. Otherwise → `not_used`.
- `openai` → currently always `not_used` (no logs ever written for OpenAI today).

Rule for `apify` cache hits: today the analyze-public-v1 pipeline does NOT write a `provider_call_logs` row for cache reads, so a snapshot served from cache will see 0 Apify rows in its narrow window. We label these `cache_hit` rather than `not_used` because the provider IS part of this report.

## Confidence aggregation (single overall badge)

Across providers that are not `not_used`:
- All sources are `provider_reported` → `confirmado`.
- All non-`not_used` are `cache_hit` → `sem_custos` (sem custos externos nesta análise).
- Mix that includes at least one `provider_reported` and at least one `estimated`/`cache_hit` → `parcial`.
- Only `estimated` (no `provider_reported`, no `cache_hit`) → `estimado`.

## Aggregation query

In `fetchReportCostSummary`, single query per call:

```ts
supabaseAdmin
  .from("provider_call_logs")
  .select("id, provider, actor, handle, status, http_status, actual_cost_usd, estimated_cost_usd, duration_ms, created_at")
  .eq("handle", instagramUsername.toLowerCase())
  .gte("created_at", new Date(createdAtMs - 60_000).toISOString())
  .lte("created_at", new Date(updatedAtMs + 60_000).toISOString())
  .order("created_at", { ascending: false })
  .limit(200);
```

For `/api/admin/reports` (list endpoint), batch this with one IN-handle query covering all returned rows, then group in JS to avoid N+1.

## Validation

1. `bunx tsc --noEmit`
2. `bun run build` (harness)
3. No provider call: only DB reads to `provider_call_logs` and existing `analysis_snapshots` queries.
4. No DELETE / UPDATE on logs or events.

## Reported cost confidence today (informational)

- **Apify** → most snapshots will surface as `estimated` (Apify rows write `estimated_cost_usd` from the heuristic, but `actual_cost_usd` is not yet wired to Apify's `usageTotalUsd`). Cache-served snapshots → `cache_hit` (no row in window).
- **DataForSEO** → snapshots that triggered Sinais de Mercado will surface as `provider_reported` (envelope `cost` is captured into `actual_cost_usd`). Snapshots without market signals → `not_used`.
- **OpenAI** → always `not_used` for now; placeholder is in place to display `calculated` once token-based logging lands.