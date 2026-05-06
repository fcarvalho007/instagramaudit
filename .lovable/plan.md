
# Billing Reconciliation Upgrade — Financial Accuracy Layer

## Current State

**What exists:**
- `provider_billing_imports` table — basic schema (no `service_group`, `label`, `raw_calculated_cost_usd`, `displayed_cost_usd`, `reconciliation_note`; no batch concept). Table is empty (0 rows).
- `billing-reconciliation.server.ts` — simple aggregation comparing `actual_cost_usd` from imports vs `estimated_cost_usd` from `provider_call_logs`.
- `reconciliation-section.tsx` — basic KPIs + chart + provider/actor tables.
- `expense-section.tsx` — mature internal cost view from `provider_call_logs` (Apify/OpenAI/DataForSEO breakdowns, actor tables, daily chart).

**What is missing:**
- Row-level precision: `raw_calculated_cost_usd` vs `displayed_cost_usd` distinction (rounding transparency).
- Batch grouping: no way to tie rows to a single dashboard export and compare batch totals.
- Rounding-aware reconciliation: the current logic flags any difference as "divergência" without distinguishing rounding from real discrepancies.
- `service_group` and `label` fields for structured provider data.

---

## 1. Database Migration

### A. ALTER `provider_billing_imports` — add missing columns

```sql
ALTER TABLE provider_billing_imports
  ADD COLUMN IF NOT EXISTS service_group text,
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS raw_calculated_cost_usd numeric,
  ADD COLUMN IF NOT EXISTS displayed_cost_usd numeric,
  ADD COLUMN IF NOT EXISTS reconciliation_note text,
  ADD COLUMN IF NOT EXISTS batch_id uuid;
```

Rename existing `service` → keep as-is (it can coexist; `service_group` is the structured field).

### B. CREATE `provider_billing_import_batches`

```sql
CREATE TABLE public.provider_billing_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  dashboard_total_actual_cost_usd numeric NOT NULL DEFAULT 0,
  imported_total_raw_cost_usd numeric,
  imported_total_displayed_cost_usd numeric,
  rounding_delta_usd numeric,
  raw_delta_usd numeric,
  reconciliation_status text NOT NULL DEFAULT 'pending',
  source_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE provider_billing_import_batches ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_billing_batches_provider ON provider_billing_import_batches (provider, period_start);
```

Add FK from `provider_billing_imports.batch_id` → `provider_billing_import_batches.id`.

Add `set_updated_at` trigger on the new table.

---

## 2. Server Logic Changes

**File: `src/lib/admin/billing-reconciliation.server.ts`**

- New function `insertBillingBatch(...)` — creates a batch row + N import rows in a single call, then auto-computes:
  - `imported_total_raw_cost_usd` = SUM(raw_calculated_cost_usd)
  - `imported_total_displayed_cost_usd` = SUM(displayed_cost_usd)
  - `rounding_delta_usd` = dashboard_total - imported_total_displayed
  - `raw_delta_usd` = dashboard_total - imported_total_raw
  - `reconciliation_status`: "OK" if raw_delta < 0.01, "Rounding difference" if raw_delta < 0.01 but displayed_delta > 0, "Needs review" otherwise.

- Update `getReconciliationData(...)` to include batch-level summaries with rounding explanation.

- Update `insertBillingImportRow(...)` to accept new fields.

---

## 3. API Route Changes

**File: `src/routes/api/admin/billing-reconciliation.ts`**

- Add `POST /api/admin/billing-reconciliation/batch` handler for batch import.
- Existing single-row POST remains for ad-hoc entries.

---

## 4. Admin UI Changes

### A. `reconciliation-section.tsx` — upgrade

- **Batch summary table**: provider, period, dashboard total, raw total, displayed total, rounding delta, status badge (OK / Rounding difference / Needs review).
- **Rounding explanation**: when status is "Rounding difference", show inline note explaining row-level rounding vs dashboard total.
- **Internal vs external comparison**: add row showing internal `provider_call_logs` total for the same provider+period.

### B. `billing-import-form.tsx` — upgrade

- Add fields: `service_group`, `label`, `raw_calculated_cost_usd`, `displayed_cost_usd`, `reconciliation_note`.
- Add batch mode: enter dashboard total, then add N rows. On submit, creates batch + rows together.

---

## 5. Insert Apify Sample Data

Using the insert tool (not migration), insert one batch + two rows:

**Batch:**
- provider: apify, period: placeholder (2026-05-01 → 2026-05-06)
- dashboard_total_actual_cost_usd: 0.66
- Auto-computed after row insert

**Row 1:** apify/instagram-scraper, 37 events × $0.0023, raw: 0.0851, displayed: 0.09
**Row 2:** apify/instagram-comment-scraper, 250 events × $0.0023, raw: 0.575, displayed: 0.58

---

## 6. What Does NOT Change

- No provider API calls
- No snapshot modifications
- No changes to `provider_call_logs`
- No changes to public report UI
- No changes to `analysis_execution_mode`
- `expense-section.tsx` continues showing internal costs unchanged

---

## 7. Validation Checklist

| Check | Expected |
|---|---|
| Apify batch dashboard total | $0.66 |
| Apify imported raw total | $0.6601 |
| Apify imported displayed total | $0.67 |
| Rounding delta | -$0.01 |
| Raw delta | -$0.0001 |
| Reconciliation status | "Rounding difference" |
| UI explains rounding | Yes |
| provider_call_logs unchanged | Yes |
| analysis_snapshots unchanged | Yes |
| No provider calls created | Yes |
| Existing expense cards work | Yes |
| tsc passes | Yes |
| vitest passes | Yes |

### Apify Financial Reconciliation Table

```text
Metric                          Value
─────────────────────────────── ──────────
Dashboard total (actual)        $0.6600
Row 1 raw (37 × 0.0023)        $0.0851
Row 2 raw (250 × 0.0023)       $0.5750
Imported raw total              $0.6601
Row 1 displayed                 $0.0900
Row 2 displayed                 $0.5800
Imported displayed total        $0.6700
Rounding delta (dash - disp)    -$0.0100
Raw delta (dash - raw)          -$0.0001
Status                          Rounding difference
```
