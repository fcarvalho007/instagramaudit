
# Custo por Report Gerado — Admin Despesa Section

## What changes

Add a new subsection with 3 KPI cards inside the existing `ExpenseSection` (Visão Geral > Despesa), placed directly after the 4-column provider summary and before the actor breakdown tables.

### Data source

**Completed reports**: Count from `analysis_snapshots` created in the last 30 days (same window as existing expense data). Each snapshot = 1 generated report.

**Fresh reports** (non-cache): Count from `analysis_events` where `data_source = 'fresh'` AND `outcome = 'success'` in the same 30-day window.

**Total API spend**: Already available in `Expense30d.total` (Apify + OpenAI + DataForSEO from `provider_call_logs`).

**Provider shares**: Already available as `apify_total`, `openai_total`, `dataforseo_total`.

### Three cards

| Card | Value | Formula |
|------|-------|---------|
| Custo medio por report | `$X.XX` | `total / completed_reports` (0-safe) |
| Despesa acumulada | `$Y.YY` | `total` + report count + provider % breakdown |
| Estimativa por novo report | `$Z.ZZ` | `fresh_total_spend / fresh_reports` if available, else fallback to avg |

### Files to edit

1. **`src/lib/admin/system-queries.server.ts`** — Extend `fetchExpense30d` to also query `analysis_snapshots` count and `analysis_events` (fresh+success count). Add fields to `Expense30d` interface: `completed_reports`, `fresh_reports`, `fresh_total_spend_usd`.

2. **`src/components/admin/v2/visao-geral/expense-section.tsx`** — Add `ReportCostSection` component rendering 3 `KPICard`s between the provider columns and actor breakdown. Uses existing `KPICard`, `AdminInfoTooltip`, `AdminSectionHeader` patterns. All copy in pt-PT per spec.

### Data details

- `completed_reports`: `SELECT COUNT(*) FROM analysis_snapshots WHERE created_at >= sinceIso`
- `fresh_reports` and `fresh_total_spend_usd`: Derived from `analysis_events` joined concept — actually, the existing `aggregateCostsFromLogs` already tracks `apifyFreshSum`/`apifyFreshCount` but only for Apify. We need total fresh spend across all providers. We will count unique `analysis_snapshot_id` values from `analysis_events` where `data_source='fresh' AND outcome='success'` and sum their `estimated_cost_usd`.
- Simpler approach: use `analysis_snapshots` count for completed reports, and for fresh cost use the total spend (since all spend comes from fresh calls — cache calls have $0 cost by definition in the current logic).

### Robustness

- Division by zero: show "—" with "sem reports concluidos neste periodo"
- Missing data: graceful fallback labels
- All values in USD, 2 decimal places, consistent with existing cards
- Period label: "ultimos 30 dias"

### No changes to

- Existing provider cards, actor breakdowns, charts
- Public report UI, P04, P05, P07, PDF, auth
- Locked files
