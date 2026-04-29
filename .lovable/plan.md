## Objective
Apply the pending migration that invalidates only the current snapshot for `frederico.m.carvalho`, then verify `count = 0`. Stop after the verification — do NOT call `/api/analyze-public-v1`, OpenAI, Apify, or DataForSEO.

## Current state (verified)
- Migration file exists: `supabase/migrations/20260429100000_invalidate_frederico_smoke_v2.sql`
- Content (4 lines, scoped strictly to one handle):
  ```sql
  DELETE FROM public.analysis_snapshots
  WHERE instagram_username = 'frederico.m.carvalho';
  ```
- Live DB check: `count = 1` for that handle → migration is genuinely pending.
- No other snapshots are touched. No schema change. No reserved schema touched.

## Steps

1. **Apply the existing migration** `20260429100000_invalidate_frederico_smoke_v2.sql` as-is. Do not create a duplicate — the existing file is correct and minimal.

2. **Verify with read-only query**:
   ```sql
   SELECT count(*)
   FROM public.analysis_snapshots
   WHERE instagram_username = 'frederico.m.carvalho';
   ```
   Expected: `0`.

3. **Stop and report** the count. Do not proceed to the smoke test.

## Guarantees / Out of scope
- No call to `/api/analyze-public-v1`.
- No OpenAI, Apify, or DataForSEO calls.
- No automatic retry.
- No changes to UI, PDF, admin, `/report.example`, or locked files.
- No other snapshots deleted (WHERE clause is exact-match on the single handle).
- No code changes.

## Reporting format after execution
- Migration applied: yes/no
- Post-migration count for `frederico.m.carvalho`: N
- Ready for fresh smoke test: yes/no (only if count = 0)

Awaiting approval to apply the migration.
