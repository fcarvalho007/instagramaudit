
## Audit Results

### 1. Database State

**`provider_billing_import_batches` (batch 92ec4b06):**

| Field | Value | Correct? |
|---|---|---|
| `dashboard_total_actual_cost_usd` | 0.66 | PASS |
| `imported_total_raw_cost_usd` | 0.6601 | PASS |
| `imported_total_displayed_cost_usd` | 0.67 | PASS |
| `rounding_delta_usd` | -0.01 | PASS |
| `raw_delta_usd` | -0.0001 | PASS |
| `reconciliation_status` | Rounding difference | PASS |

**`provider_billing_imports` (2 rows):**

| actor | actual_cost_usd | displayed_cost_usd | raw_calculated_cost_usd |
|---|---|---|---|
| instagram-scraper | 0.09 | 0.09 | 0.0851 |
| instagram-comment-scraper | 0.58 | 0.58 | 0.575 |
| **SUM** | **0.67** | **0.67** | **0.6601** |

Row-level `actual_cost_usd` was previously updated to match `displayed_cost_usd`. Both sum to $0.67, not $0.66.

### 2. Server Query Logic (`billing-reconciliation.server.ts`)

**Line 98 — FAIL:**
```ts
const externalTotal = ext.reduce((s, r) => s + Number(r.actual_cost_usd ?? 0), 0);
```
Sums row-level `actual_cost_usd` = $0.67. Should use `dashboard_total_actual_cost_usd` from the batch = $0.66.

**Lines 116, 136-139 — FAIL:**
Daily and provider breakdowns also sum row-level `actual_cost_usd`, producing $0.67 for Apify external.

**Batch summary (lines 191-219) — PASS:**
Correctly uses `b.dashboard_total_actual_cost_usd` for `dashboard_total`.

### 3. UI Display (`expense-section.tsx`)

**Reconciliation table (Zona 3) — FAIL:**
`buildReconRows()` line 730 shows `ext.external` from `byProvider`, which comes from the flawed row-sum ($0.67). Label says "Faturado real" but value is the rounded-row sum.

**Actor detail table (Zona 4) — PASS:**
Uses `provider_call_logs.actual_cost_usd` (internal), not billing imports.

**Provider cards (Zona 1) — PASS:**
Shows internal attributed costs only.

### 4. Summary

| Check | Result |
|---|---|
| Batch-level dashboard total | PASS ($0.66) |
| Row-level actual_cost_usd semantic | FAIL (ambiguous — holds displayed-rounded value, not dashboard total) |
| KPI externalTotal source | FAIL (row-sum $0.67, not batch $0.66) |
| Provider breakdown external | FAIL (same row-sum path) |
| Daily chart external | FAIL (same row-sum path) |
| Reconciliation table "Faturado real" | FAIL (shows $0.67) |
| Labels distinguish internal/external/rounded | FAIL (no separation) |
| Rounding delta visible in UI | FAIL (not shown) |

---

## Proposed Correction Plan

### A. Data Correction

**Revert row-level `actual_cost_usd` back to raw values** (undo the previous rounding update):

```
UPDATE provider_billing_imports SET actual_cost_usd = 0.0851
WHERE id = 'e65d64f7-...' AND provider = 'apify';

UPDATE provider_billing_imports SET actual_cost_usd = 0.575
WHERE id = 'cf5a09ab-...' AND provider = 'apify';
```

After this:
- `actual_cost_usd` = raw calculated (0.0851 + 0.575 = 0.6601)
- `displayed_cost_usd` = dashboard-rounded (0.09 + 0.58 = 0.67)
- Batch `dashboard_total_actual_cost_usd` = 0.66 (authoritative)

**Semantic rule going forward:** `actual_cost_usd` at row level stores the raw calculated value. `displayed_cost_usd` stores the dashboard-rounded value. The batch-level `dashboard_total_actual_cost_usd` is the single source of truth for the provider total.

### B. Server Logic Fix (`billing-reconciliation.server.ts`)

1. **Provider external total** must come from `dashboard_total_actual_cost_usd` in the batch table, not from summing import rows.
2. Build a `Map<provider, dashboardTotal>` from batches, use it for KPIs and `byProvider`.
3. Daily chart: keep row-level granularity but use `raw_calculated_cost_usd` (not `actual_cost_usd` which is ambiguous after correction).
4. Add `displayedRowSum` and `roundingDelta` to the provider breakdown response so the UI can show all three values.

### C. UI Fix (`expense-section.tsx`)

Update Zona 3 reconciliation table columns:

| Fornecedor | Interno registado | Faturado externo (dashboard) | Soma linhas arredondadas | Δ arredondamento | Δ interno vs externo | Estado |
|---|---|---|---|---|---|---|

- "Faturado externo (dashboard)" = batch `dashboard_total`
- "Soma linhas arredondadas" = `displayed_total` from batch
- "Δ arredondamento" = `rounding_delta` from batch
- "Δ interno vs externo" = dashboard_total - internal

### D. Files to Change

| File | Change |
|---|---|
| `src/lib/admin/billing-reconciliation.server.ts` | Use batch dashboard_total for provider external; add rounding breakdown to response |
| `src/components/admin/v2/visao-geral/expense-section.tsx` | Update reconciliation table columns and labels |
| DB migration | Revert `actual_cost_usd` on 2 rows |

### E. Files NOT to Touch

- `src/lib/admin/system-queries.server.ts` (internal cost logic is correct)
- `src/components/admin/v2/receita/billing-import-form.tsx` (already disconnected)
- Any public report UI
- Any PDF pipeline
- Any provider execution logic
- `src/integrations/supabase/client.ts` / `types.ts`

### F. Risks and Rollback

- **Risk:** If other queries depend on row-level `actual_cost_usd` being rounded, they will see different values. Audit found no other consumers.
- **Rollback:** Re-run the previous UPDATE to set actual_cost_usd = displayed_cost_usd values.
