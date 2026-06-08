# Admin visibility for analysis windows — PR scope

Tasks 1 and 2 are already shipped (see "Already in place" below). This PR adds the two remaining surfaces: an overview card on `/admin/visao-geral` and a window badge in the `/admin/sistema` cost breakdown. No schema changes, no credit logic changes, no provider calls.

## Already in place (no changes)

- **Task 1 — Reports table**: `reports-table-section.tsx:170/199` renders the window via `<AdminBadge variant={windowBadgeVariant(win)}>{windowLabel(win)}</AdminBadge>`. `windowBadgeVariant` returns `neutral` for baseline (no accent) and `info`/`revenue` for 30d/90d (subtle accent). Existing filters/layout untouched.
- **Task 2 — Lead detail**: `beta-leads/lead-detail-sheet.tsx:2487/2548` already shows recent analyses with handle, window badge, snapshot id, created_at, data_source, and an "Análise · {win}" label. Window is derived via `deriveWindow(ev.analysis_window, ev.cache_key)`. No invented FK linkage.

## Task 3 — Overview card "Análises por janela"

### New server route

`src/routes/api/admin/analysis-window-counts.ts`
- `GET ?period=7d|30d|90d` (default `30d`). Admin-only via `requireAdminSession`.
- Single query against `analysis_events`:
  ```sql
  SELECT analysis_window, cache_key, count(*)
  FROM analysis_events
  WHERE created_at >= now() - interval '<period>'
  GROUP BY analysis_window, cache_key  -- aggregated in JS via deriveWindow
  ```
  Implementation will fetch `analysis_window, cache_key` for the period (capped, e.g. `limit 5000`) and reduce client-side using the existing `deriveWindow` helper so baseline rows that pre-date the column still bucket correctly via the `:w=…` cache_key suffix.
- Response: `{ period: "30d", total: number, baseline: number, "30d": number, "90d": number, other: number, generated_at: string }`.

### New component

`src/components/admin/v2/visao-geral/analysis-window-card.tsx`
- Renders a single admin card (matches existing `KPICard` / `CostSummaryCard` visual system) with three primary stats (Baseline / 30 dias / 90 dias) and a small `other` footnote only when > 0.
- Each stat uses the same accent as the badges (`neutral`, `info`, `revenue`) for instant visual parity with the reports table.
- Loading: `<SectionSkeleton rows={1} rowHeight={120} />`. Error: `<SectionError />`. Empty (total=0): subtle "Sem análises nesta janela." message — does not crash the page.

### Wiring

`src/routes/admin.visao-geral.tsx`
- Import `<AnalysisWindowCard />` and add it as a new row directly under `<OverviewKpiRow />` (single column on mobile, full-width on desktop). No other layout shifts.

## Task 4 — Window badge in cost breakdown

### Server change

`src/routes/api/admin/analysis-cost-breakdown.ts`
- Extend the `analysis_events` select to include `analysis_window, cache_key` (lines 73).
- Add both to `AnalysisBreakdown` type and push them into each result row (lines 28-54, 195-221).

### Client change

`src/components/admin/v2/sistema/analysis-cost-breakdown.tsx`
- Extend the local `AnalysisBreakdown` interface with `analysis_window: string | null; cache_key: string | null`.
- Import `deriveWindow`, `windowBadgeVariant`, `windowLabel` from `@/lib/admin/analysis-window` and `AdminBadge`.
- In `AnalysisRow` (line 170 area), render a small badge next to `@{a.handle}`:
  `<AdminBadge variant={windowBadgeVariant(win)} size="sm">{windowLabel(win)}</AdminBadge>`
  where `win = deriveWindow(a.analysis_window, a.cache_key)`. Baseline keeps the neutral variant so existing rows read identically.

## Out of scope

- No new column in `analysis_events`, `provider_call_logs`, or `analysis_snapshots`.
- No change to `credit_ledger`, reservation, or any pricing logic.
- No new provider runners or backfill.
- No edits to `/report.example`, checkout, EuPago, Free/Public report, or competitor comparison UI.
- No retroactive write to `analysis_window` for old events (we rely on the existing cache_key fallback inside `deriveWindow`).

## Validation

1. `bun run build` / typecheck pass (covered automatically).
2. `/admin/visao-geral` loads with the new card under the KPI row; counts sum to the total for the selected period.
3. `/admin/sistema` cost breakdown shows a `baseline` / `30d` / `90d` badge per row; baseline rows remain visually quiet.
4. `/admin/relatorios` and lead detail unchanged (regression check).
5. Manual SQL sanity (read-only) on Cloud:
   ```sql
   SELECT
     coalesce(analysis_window,
       case when cache_key ~ ':w=30d$' then '30d'
            when cache_key ~ ':w=90d$' then '90d'
            else 'baseline' end) AS win,
     count(*)
   FROM analysis_events
   WHERE created_at >= now() - interval '30 days'
   GROUP BY 1;
   ```
   Numbers should match the new card.

## Risks / mitigations

- **Wrong bucketing for legacy rows**: mitigated by reusing `deriveWindow` (cache_key fallback already in production).
- **Card empty during fresh installs**: handled by an explicit empty state instead of a NaN.
- **Performance**: limit of 5000 rows per period query is well below `analysis_events` typical volume; if it grows, switch the endpoint to a server-side aggregate using the same SQL above.
