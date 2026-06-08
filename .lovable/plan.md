## Goal

Run one controlled 90d call on `/api/analyze-public-v1`, observe the cache + credit + Apify behaviour, then repeat to confirm cache reuse. No UI, no schema, no checkout. No OpenAI / no DataForSEO calls expected.

## Pre-check (read-only, already verified)

| Check | Result |
|---|---|
| `lead_entitlements.product_code` schema | `report_full_9` is the gate code in `analyze-public-v1.ts:586` |
| Any lead currently has `report_full_9` | **No.** `lead_entitlements` is empty (0 rows). |
| Apify allowlist | `frederico.m.carvalho, martimsilvai, mariiana.ai` |
| Existing `:w=90d` snapshot/event | **None** for any of the 3 allowlisted handles |
| Owner test lead (used for prior 30d) | `01bf861c-6a17-4b36-81b7-130ef2f143da` — current credit balance = 0 |
| 90d config (`window-configs.ts`) | resultsLimit 300, timeout 160s, `maxTotalChargeUsd $0.30` |
| Apify cost estimate | post-scraper ≈ $2.30/1000 → 300 posts ≈ $0.69 → cap will fire ≈ 130 posts |

Two blockers must be resolved before execution:

1. **No Pro entitlement exists** for any lead. The gate at line 586 will return `WINDOW_REQUIRES_PRO` for everyone.
2. **Owner lead `01bf861c…` has 0 credits.** A reserve attempt will return `INSUFFICIENT_CREDITS`.

## Proposed execution (requires user approval — writes data)

Lead: `01bf861c-6a17-4b36-81b7-130ef2f143da` (the same lead used for the validated 30d run).
Handle: `frederico.m.carvalho` (allowlisted, most-tested).

Steps (all server-side, no UI):

1. **Grant `report_full_9` entitlement** to the test lead (single INSERT into `lead_entitlements`, idempotent via unique constraint).
2. **Top up 1 credit** for the lead — insert a `credit_ledger` row (`delta=+1`, `reason='test_topup'`). Required so the reserve can succeed.
3. **Mint a signed lead session cookie** for the test lead using `SESSION_SECRET` (read inside a one-shot Node script, never echoed). Format defined in `src/lib/leads/lead-cookie.server.ts`.
4. **Call 1 (cache miss):** `POST https://id-preview--…lovable.app/api/analyze-public-v1` with `Cookie: lead_session=<signed>` and body `{ "instagram_username": "frederico.m.carvalho", "competitor_usernames": [], "window": "90d" }`. Capture HTTP status, response body, runtime.
5. **Call 2 (cache hit):** identical request a few seconds later.
6. **Inspect outcomes** in `analysis_events`, `analysis_snapshots`, `credit_ledger`, `provider_call_logs` filtered by `:w=90d`.

## Validation matrix (will report PASS/FAIL on each)

| Check | Source |
|---|---|
| Call 1 HTTP 200 | response status |
| Snapshot row created with `cache_key` suffix `:w=90d` | `analysis_snapshots` |
| `analysis_window='90d'` persisted on the event | `analysis_events` |
| Exactly 1 `credit_ledger` reserve (delta -1) on call 1 | `credit_ledger` |
| Exactly 1 `provider_call_logs` row, provider='apify' | `provider_call_logs` |
| 0 OpenAI / 0 DataForSEO rows in `provider_call_logs` for the window | `provider_call_logs` |
| Call 2 HTTP 200, `data_source='cache'`, **0** new credit_ledger rows | events + ledger |
| Apify estimated cost & actual cost | `provider_call_logs.estimated_cost_usd / actual_cost_usd` |
| Runtime duration (call 1 vs call 2) | wall clock |

## Out of scope (will not touch)

- UI surfaces (no Pro chip, no selector toggle changes)
- Schema (no migration; only INSERTs into existing tables)
- Checkout / EuPago / payments
- OpenAI / DataForSEO providers
- Competitor comparison flow (empty competitor list)
- `/report.example`

## Risks & mitigations

- **Apify spend up to $0.30** (hard cap from `maxTotalChargeUsd`). Daily cap secret `APIFY_DAILY_CAP_USD=5` is well above.
- **Cap will likely fire mid-run** → snapshot truncated to ~130 posts. This is itself a key finding and feeds the recommendation.
- **1 real credit will be consumed** from the test lead. Mitigated by the +1 top-up in step 2.
- **Entitlement row will remain** unless explicitly removed. Optional post-test cleanup: DELETE the inserted `lead_entitlements` row + the +1 credit row (or leave for follow-up admin testing).

## Decisions needed from you

1. **Approve the two data writes** (entitlement INSERT + 1-credit top-up INSERT)?
2. **Test handle:** stick with `frederico.m.carvalho`, or pick a less-analyzed one (`martimsilvai` / `mariiana.ai`) to keep the owner profile cache clean?
3. **Post-test cleanup:** remove the test entitlement & top-up row, or keep them for future admin tests?

## Final deliverable I will return

- PASS/FAIL table for every validation row above
- Apify estimated + actual cost, posts returned (with note if cap fired)
- Wall-clock runtime call 1 vs call 2
- Credit delta before/after
- Recommendation: expose 90d now, or keep behind feature flag (per the prior 90d audit, default lean is **flag OFF until the cap behaviour is observed**, which this test will confirm or refute)
