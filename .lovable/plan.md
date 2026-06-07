## Cleanup: temporary PR1 validation entitlement

### Before state (confirmed via read query)

One row in `lead_entitlements` for lead `7b946d45-ecb1-49dc-8702-68d85a860c47`:

- `id`: `2e408df0-9a64-405f-bda0-1cb0dfe08988`
- `product_code`: `report_full_9`
- `payment_id`: `NULL` (no real payment)
- `granted_at`: `2026-06-07 15:51:21Z`
- `metadata`: `{ source: "manual_pr1_validation", round: 2, t0: "2026-06-07T15:51:13Z" }`

Metadata `source = manual_pr1_validation` and absence of `payment_id` clearly identify this as the temporary QA grant (not a real paid entitlement).

### Action

Execute exactly one `DELETE` scoped by primary key AND the QA-identifying metadata, to make accidental deletion of a paid row impossible:

```sql
DELETE FROM lead_entitlements
WHERE id = '2e408df0-9a64-405f-bda0-1cb0dfe08988'
  AND lead_id = '7b946d45-ecb1-49dc-8702-68d85a860c47'
  AND product_code = 'report_full_9'
  AND payment_id IS NULL
  AND metadata->>'source' = 'manual_pr1_validation';
```

### Out of scope (untouched)

- Credits ledger, payments, checkout, EuPago, schema, Apify, OpenAI, DataForSEO.
- Any entitlement with a non-null `payment_id`.
- Lead `01bf861c…` (production QA session).

### Validation

Re-run `SELECT … FROM lead_entitlements WHERE lead_id = '7b946d45…'` and confirm zero rows. Report before (1 row, shown above) and after (0 rows).
