
## Existing Data Found

**Batch** `92ec4b06` already exists with correct period, totals, and reconciliation metadata. No new batch needed.

**2 import rows** already exist and are correctly linked to the batch. The only discrepancy:

| Field | Row 1 (scraper) current | Requested | Row 2 (comments) current | Requested |
|-------|------------------------|-----------|--------------------------|-----------|
| `actual_cost_usd` | 0.0851 (raw) | **0.09** (displayed) | 0.575 (raw) | **0.58** (displayed) |
| `raw_calculated_cost_usd` | 0.0851 | 0.0851 | 0.575 | 0.5750 |
| `displayed_cost_usd` | 0.09 | 0.09 | 0.58 | 0.58 |

Everything else (batch totals, quantities, labels, notes) is already correct.

## Proposed Operations

**UPDATE 2 rows** in `provider_billing_imports` — set `actual_cost_usd` to the displayed/rounded value (what Apify actually charges), since the raw value is already stored in `raw_calculated_cost_usd`.

```sql
-- Row 1: apify/instagram-scraper
UPDATE provider_billing_imports
SET actual_cost_usd = 0.09, updated_at = now()
WHERE id = 'e65d64f7-67d5-4d4f-9e9e-3774b04190d1';

-- Row 2: apify/instagram-comment-scraper
UPDATE provider_billing_imports
SET actual_cost_usd = 0.58, updated_at = now()
WHERE id = 'cf5a09ab-340f-4af0-8366-56cef223ba93';
```

No batch update needed — all batch-level values already match.

## Expected UI Values After Update

| Card / Zone | Before | After |
|-------------|--------|-------|
| Reconciliation: Apify external total | $0.66 (from batch) | $0.66 (unchanged) |
| Reconciliation: Apify import rows sum | $0.6601 (0.0851 + 0.575) | **$0.67** (0.09 + 0.58) — matches `imported_total_displayed_cost_usd` |
| Import row detail: scraper actual | $0.0851 | **$0.09** |
| Import row detail: comments actual | $0.575 | **$0.58** |

The reconciliation view will now show `actual_cost_usd` aligned with the Apify dashboard displayed values. The `raw_calculated_cost_usd` column preserves the pre-rounding arithmetic.

## Risks and Rollback

- **Risk**: Minimal — only 2 field updates on billing import rows, no structural change.
- **Rollback**: Set `actual_cost_usd` back to raw values (0.0851 and 0.575).
- **No impact** on `provider_call_logs`, snapshots, report UI, or analysis execution.
