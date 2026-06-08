# 90d Pro analysis — safest runtime smoke plan

No execution. Code/DB read-only. Includes browser snippet, before/after SQL, and rollback. Requires one explicit approval to grant a temporary `report_full_9` entitlement (the database currently has zero Pro leads).

## 1. Test lead

- **Lead ID**: `01bf861c-6a17-4b36-81b7-130ef2f143da`
- **Email**: `frederico.carvalho@digitalfc.pt`
- **Why this lead**: it is the only lead in the DB that already owns the existing 90d snapshot for `frederico.m.carvalho` (row in `lead_reports` for `v1:frederico.m.carvalho|:w=90d`). The snapshot is fresh (expires `2026-06-09 16:01:49+00`). This makes the smoke a **guaranteed cache hit** with **zero provider cost**.

## 2. Required entitlement state

- Lead currently has **no** `report_full_9` entitlement (verified: `lead_entitlements` returns 0 rows for this lead).
- The wide-window Pro gate (`analyze-public-v1.ts:585-599`) runs **before** the cache short-circuit, so without entitlement the request returns `WINDOW_REQUIRES_PRO` and never enters the cache branch.
- **Action required (separate approval)**: insert one row temporarily, then revoke.

Approval-only INSERT (do NOT run until user approves):

```sql
INSERT INTO public.lead_entitlements (lead_id, product_code, granted_at, metadata)
VALUES (
  '01bf861c-6a17-4b36-81b7-130ef2f143da',
  'report_full_9',
  now(),
  jsonb_build_object('source','manual_smoke_90d','note','temporary; revoke after test')
);
```

## 3. Required credit balance

- Current balance: **0** (`SELECT public.credit_balance('01bf861c-...')`).
- **No top-up needed**. Cache-fresh + already-associated → `skipReserve = true` (server: `analyze-public-v1.ts:601`). The reservation step is bypassed entirely, so balance 0 is fine and is also the strongest proof that no credit was charged.

## 4. Handle to test

- Primary: `frederico.m.carvalho`
- Competitors: `[]` (must be empty — the existing 90d cache_key has no competitor segment).

## 5. Expected cache_key

- `v1:frederico.m.carvalho|:w=90d`
- Built by `buildCacheKey('frederico.m.carvalho', [], '90d')` in `src/lib/analysis/cache.ts:49-60`.

## 6. Expected `credit_ledger` behaviour

- **No new row.** `skipReserve` path means `reserveCredit` is not called.
- Balance after test must remain `0`.
- Verification: `SELECT count(*)` filtered to this lead + `created_at > <test_start>` must equal `0`.

## 7. Expected `provider_call_logs` behaviour

- **No new row.** Cache fresh hit returns the existing snapshot without invoking Apify, DataForSEO, or OpenAI.
- Verification: `SELECT count(*)` filtered to `handle='frederico.m.carvalho' AND created_at > <test_start>` must equal `0`.

## 8. Rollback / cleanup

Run immediately after the smoke (or if the test is aborted):

```sql
DELETE FROM public.lead_entitlements
WHERE lead_id = '01bf861c-6a17-4b36-81b7-130ef2f143da'
  AND product_code = 'report_full_9'
  AND metadata->>'source' = 'manual_smoke_90d';
```

Confirm cleanup:

```sql
SELECT count(*) FROM public.lead_entitlements
WHERE lead_id = '01bf861c-6a17-4b36-81b7-130ef2f143da'
  AND product_code = 'report_full_9';
-- expected: 0
```

No other tables need cleanup (no ledger row, no provider log, no new snapshot — the cache row already exists and is untouched apart from a possible `updated_at` bump on hit).

## 9. Browser console snippet

Run while logged in as `frederico.carvalho@digitalfc.pt` (cookie `lead_session` must be present) on any page of the app, after the entitlement has been granted.

```js
// Pro 90d smoke — guaranteed cache hit for an already-owned snapshot.
// Expected: { success: true, data_source: "cache", ... }
await fetch("/api/analyze-public-v1", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    instagram_username: "frederico.m.carvalho",
    competitor_usernames: [],
    window: "90d",
  }),
}).then(r => r.json()).then(console.log);
```

Pass criteria in the response:
- `success === true`
- `data_source === "cache"`
- No 401/403/`WINDOW_REQUIRES_PRO`/`INSUFFICIENT_CREDITS`.

## 10. SQL read-only queries

### Before the test (record a baseline)

```sql
-- Baseline ledger and provider counts for this lead/handle.
SELECT now() AS test_start;

SELECT public.credit_balance('01bf861c-6a17-4b36-81b7-130ef2f143da') AS balance_before;

SELECT count(*) AS ledger_rows_before
FROM public.credit_ledger
WHERE lead_id = '01bf861c-6a17-4b36-81b7-130ef2f143da';

SELECT count(*) AS provider_rows_before
FROM public.provider_call_logs
WHERE handle = 'frederico.m.carvalho';

SELECT id, cache_key, updated_at, expires_at
FROM public.analysis_snapshots
WHERE cache_key = 'v1:frederico.m.carvalho|:w=90d';

SELECT count(*) AS owns_report
FROM public.lead_reports
WHERE lead_id = '01bf861c-6a17-4b36-81b7-130ef2f143da'
  AND cache_key = 'v1:frederico.m.carvalho|:w=90d';
-- expected: 1
```

### After the test (must match these expectations)

```sql
-- balance unchanged
SELECT public.credit_balance('01bf861c-6a17-4b36-81b7-130ef2f143da') AS balance_after;
-- expected: same as balance_before (0)

-- no new ledger row
SELECT id, delta, reason, cache_key, created_at
FROM public.credit_ledger
WHERE lead_id = '01bf861c-6a17-4b36-81b7-130ef2f143da'
  AND created_at > '<test_start>'::timestamptz;
-- expected: 0 rows

-- no new provider call
SELECT id, provider, status, posts_returned, estimated_cost_usd, created_at
FROM public.provider_call_logs
WHERE handle = 'frederico.m.carvalho'
  AND created_at > '<test_start>'::timestamptz;
-- expected: 0 rows

-- snapshot row unchanged (id same; updated_at may bump but expires_at unchanged)
SELECT id, updated_at, expires_at
FROM public.analysis_snapshots
WHERE cache_key = 'v1:frederico.m.carvalho|:w=90d';

-- analysis_events should show data_source='cache' for the new event
SELECT data_source, outcome, analysis_window, created_at
FROM public.analysis_events
WHERE handle = 'frederico.m.carvalho'
  AND created_at > '<test_start>'::timestamptz
ORDER BY created_at DESC;
-- expected: 1 row, data_source='cache', outcome='success', analysis_window='90d'
```

## Approval checklist (tick before executing)

1. [ ] Approve the temporary INSERT into `lead_entitlements` for lead `01bf861c-...` (section 2).
2. [ ] Confirm test lead, handle, and empty competitor list (sections 1, 4).
3. [ ] Capture the `Before` SQL output and note `test_start` timestamp (section 10).
4. [ ] Run the browser snippet (section 9) once, logged in as that lead.
5. [ ] Capture the `After` SQL output and verify all expectations (section 10).
6. [ ] Run the rollback DELETE (section 8) and confirm 0 remaining entitlement rows.
7. [ ] Only after all checks pass, decide whether to open 90d to public Pro users.

## Why this is the safest possible 90d test

- Uses an existing fresh, lead-owned 90d snapshot → the server's `skipReserve = cacheFreshHit && alreadyAssociated` branch fires.
- Provider runners are not entered on cache-fresh hits → no Apify / DataForSEO / OpenAI cost.
- Credit ledger is not written → financial side-effects are zero.
- The only mutation is one temporary `lead_entitlements` row, fully reversible by the rollback in section 8.
- A live, uncached 90d call (different handle or no existing snapshot) is **not part of this plan** and would require a separate approval because it would hit Apify.
