## Smoke test — credit idempotency (fresh lead)

Read-only verification of the duplicate-reserve fix. The browser flow creates one new lead (necessary to exercise the path); all other steps are SELECT-only.

### Steps

1. **Pre-flight (SQL, read-only)**
   - Confirm unique index `uniq_credit_ledger_reserve_per_report` on `credit_ledger(lead_id, cache_key) WHERE reason='reserve'` still exists.
   - Snapshot `max(created_at)` from `leads` to identify the new lead afterward.

2. **Browser flow (preview iframe, fresh session)**
   - `navigate_to_sandbox` → `/` with cleared session (new browser context).
   - Enter handle `frederico.m.carvalho`.
   - Complete onboarding (3 steps, unique `smoke+<ts>@auditprofiles.com`).
   - Capture network: `POST /api/onboarding/start` (expect 200, sets `lead_session`), `POST /api/analyze-public-v1` (expect 200), snapshot GETs, report render.
   - After report renders, **reload** the report URL once.
   - Record full request sequence with status, duration, and duplicate detection.

3. **Post-flow validation (SQL, read-only)** for the new `lead_id`:
   - `credit_ledger`: exactly 1× `initial_grant` (+2), 1× `reserve` (−1), 1× `confirm` (0), final balance = 1.
   - `lead_reports`: exactly 1 row for `(lead_id, cache_key)`.
   - Reload did not add ledger rows; balance still 1.
   - No `ONBOARDING_REQUIRED` / `ONBOARDING_SESSION_LOST` / `INSUFFICIENT_CREDITS` in worker logs or response bodies.
   - `analysis_events.data_source` for the reload = `cache` (no provider spend).

### Output

- Request sequence table (method, path, status, ms, duplicate?)
- Credit ledger table (reason, delta, cache_key, created_at)
- Final balance
- Duplicate-request detection + whether they consumed credits
- Verdict: **READY** / **BLOCKED**

### Note

This requires browser automation + creating one real lead row. If you prefer a purely read-only check against the previous smoke lead (`7d45c693-c97e-4c2f-a68e-3d9f70e482b2`) without creating a new one, say so and I'll re-validate ledger/lead_reports/balance on that lead only.
