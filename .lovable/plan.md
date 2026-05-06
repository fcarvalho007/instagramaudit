## Current State (verified via read queries)

| Check | Result |
|-------|--------|
| `analysis_execution_mode` | Already `cache_only` — no change needed |
| `frederico.m.carvalho` (683e4c21) | comments = "pending", has all enrichments, no thumbnail |
| `martimsilvai` (883cf964) | comments = "pending", has all enrichments, no thumbnail |

## Plan

### Task 1 — Skip (already done)
`analysis_execution_mode` is already `cache_only`. No action required.

### Task 2 — Reconcile comments status
Call the existing `set_enrichment_status` RPC for each snapshot:

```sql
SELECT set_enrichment_status('683e4c21-60e0-4045-b43a-dfcd85fe9896', 'comments', 'success');
SELECT set_enrichment_status('883cf964-fb76-4237-bc0a-8924ec901c1f', 'comments', 'success');
```

This uses the atomic `jsonb_set` function already in the database — no direct payload manipulation.

### Task 3 — Validation
Run read-only queries to confirm:
- Both snapshots now show `enrichment_status.comments = "success"`
- No `_thumbnail_base64` key present
- All enrichment keys intact
- No new rows in `provider_call_logs` created during this window

## Safety
- No providers called (pure SQL update via existing RPC)
- No cache expiry
- No snapshot deletion
- No report UI changes
