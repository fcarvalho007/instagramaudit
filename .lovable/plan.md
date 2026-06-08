## Current state vs requirements

Most of this work was already shipped in a prior turn. Verified in code:

| Requirement | Status | Where |
|---|---|---|
| Reports table — Janela / Origem / Concorrentes / Snapshot / Criado columns | **Already done** | `src/components/admin/v2/relatorios/reports-table-section.tsx` (uses `deriveWindow`, `windowBadgeVariant`) |
| Lead detail — Saldo actual, summary, ledger timeline (delta / reason / handle / snapshot id / created_at), period vs grant chip | **Already done** | `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` "Créditos" tab |
| Lead detail — recent analysis events for the lead's handles | **Already done** | same file, "Análises recentes" sub-section |
| `deriveWindow` / `windowBadgeVariant` / `windowLabel` helpers | **Already done** | `src/lib/admin/analysis-window.ts` |
| `/api/admin/lead-credit-activity/:id` read endpoint | **Already done** | `src/routes/api/admin/lead-credit-activity.$id.ts` |

Validation already satisfied:
- Reports table makes snapshot `3f8b1dcf…` identifiable as `30d` and baseline rows as `baseline`.
- Owner lead `01bf861c…` shows balance, ledger and recent events without raw SQL.

## What is still missing

Only requirement **#3 (Analysis detail / report drawer)** is partial. `src/components/admin/v2/report-drawer.tsx` renders `MockReportDetail` plus `costs`/`events` but never shows:

- analysis window (baseline / 30d / 90d)
- cache_key
- data source (cache / fresh / blocked)
- short snapshot id
- competitor handles
- per-run estimated / actual cost in a way tied to the analysis_event

And ledger labelling in the lead sheet doesn't yet distinguish two extra kinds the user asked for: **purchase included** and **beta bonus** (both currently appear as plain `reserve` / `admin_adjust`).

No schema change is needed — every field already lives in `analysis_events`, `provider_call_logs`, and `credit_ledger.metadata`.

## Plan (read model + UI only)

### 1. Extend `/api/admin/report-detail/:id` (read-only)

`src/routes/api/admin/report-detail.$id.ts` — add a new `analysisEvent` block to the response when the report has a snapshot:

```ts
analysisEvent: {
  id, analysis_window, cache_key, data_source, outcome,
  estimated_cost_usd, posts_returned, duration_ms,
  competitor_handles: string[],
  snapshot_id: string | null,
  provider_call: { provider, status, estimated_cost_usd, actual_cost_usd, apify_run_id } | null
}
```

Logic: look up the latest `analysis_events` row by `analysis_snapshot_id` (prefer `outcome='success'`), then join to `provider_call_logs` by `provider_call_log_id`. Read-only, no writes.

### 2. Update `MockReportDetail` type and drawer (UI)

`src/lib/admin/mock-data.ts` — extend the type with an optional `analysisEvent` matching the API shape (kept optional so mock data still works).

`src/components/admin/v2/report-drawer.tsx`:

- **DrawerHeader**: add a row of badges right of `StatusBadge` — Janela (uses `windowBadgeVariant`), Origem (`AdminBadge` info=cache / signal=fresh / danger=blocked / neutral=other), Concorrentes (chip with count + tooltip listing handles).
- New **AnalysisEventCard** section between `PhasesGrid` and `CostsTable`:
  - Handle (`@frederico.m.carvalho`)
  - Janela badge
  - `cache_key` in `admin-code`
  - Data source badge
  - Provider status (`apify · success`)
  - Estimated / actual cost (tabular-nums)
  - Snapshot id (first 8 chars, `admin-code`)
  - Competitor handles (inline chips, "—" if empty)
- Gracefully render nothing when `analysisEvent` is null (mock-only rows).

### 3. Ledger label refinement (lead detail)

`src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` — in the ledger row mapper, derive a single `ledgerKind` chip with these labels:

- `initial_grant` → "Crédito inicial" (info)
- `admin_adjust` + `metadata.kind='post_purchase_beta_bonus'` → "Bónus beta" (signal)
- `admin_adjust` + other → "Ajuste manual" (neutral)
- `reserve` + cache_key suffix `:w=30d|:w=90d` → "Análise período · 30d/90d" (uses `windowBadgeVariant`)
- `reserve` + plain baseline → "Análise baseline" (neutral)
- `confirm` → "Confirmado" (revenue)
- `release` → "Estorno" (neutral)
- (Competitor-only purchases are bundled in primary today, so no separate chip yet — leave a `// TODO` for when that changes.)

To support this, `/api/admin/lead-credit-activity/:id` must include `metadata.kind` in the returned ledger rows. Verify it does; if not, expand the SELECT to include `metadata`.

### Files touched

- `src/routes/api/admin/report-detail.$id.ts` (extend response)
- `src/lib/admin/mock-data.ts` (extend type, optional field)
- `src/components/admin/v2/report-drawer.tsx` (header badges + new card)
- `src/components/admin/v2/beta-leads/lead-detail-sheet.tsx` (label refinement)
- `src/routes/api/admin/lead-credit-activity.$id.ts` (include `metadata` if missing)

### Out of scope

- No schema change.
- No edits to `analyze-public-v1`, providers, credits backend, EuPago, checkout.
- No customer-facing report changes.
- No new writes; all four endpoints stay read-only.

### Validation after build

- Open Relatórios → click the 30d row for `frederico.m.carvalho` → drawer shows Janela `30d`, Origem `cache/fresh`, cache_key suffix `:w=30d`, snapshot `8d8d735c…`, Apify provider row with cost.
- Open Relatórios → click the most recent baseline row → drawer shows Janela `baseline`, no `:w=` suffix.
- Open lead `01bf861c…` → ledger now shows distinct chips: Crédito inicial / Análise baseline / Análise período · 30d / Confirmado.
- Typecheck passes (`MockReportDetail.analysisEvent` is optional → no churn at mock call sites).
