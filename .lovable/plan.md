## PR1 minimal-risk validation — baseline + 30d + repeat + Free 30d (skip 90d)

### Pre-state confirmed (read-only)

| Lead | Email | Balance | `report_full_9`? |
|---|---|---|---|
| `01bf861c-…` | frederico.carvalho@digitalfc.pt | **1** | **No** |
| `7b946d45-…` | fredericodigital@gmail.com | 1 | No |

- Baseline snapshot `v1:frederico.m.carvalho|` expires at **08:51 UTC today** (now is 08:21 UTC → ~30 min runway). After expiry, scenario 1 baseline triggers a fresh Apify call (~$0.05).
- No `v1:frederico.m.carvalho|:w=30d` snapshot exists yet → scenario 2 will fire an Apify 30d call (~$0.05–0.10).
- No `report_full_9` row exists for either lead → must be granted temporarily.

### Why I cannot run this end-to-end alone

The Pro gate is keyed on the `lead_session` cookie that lives in your browser. I have no way to authenticate as that lead from the sandbox without `INTERNAL_API_TOKEN` — which you explicitly forbade. I can run SQL (pre-state, post-state, rollback) and watch DB deltas, but the four HTTP calls must originate from your browser tab.

### Step-by-step plan (you drive the browser, I drive the DB)

#### Pre-flight (you, 30 seconds)

1. Open production tab in browser (the same tab that's been hitting `/analyze/frederico.m.carvalho`).
2. Hit `https://auditprofiles.com/api/debug/lead-session-status` in that same tab.
3. **Paste the JSON back to me.** I will not proceed until `lead_id` is confirmed to match `01bf861c-…` (or, if your cookie maps to `7b946d45-…`, I adapt the plan to that lead).

#### Setup (me, in build mode, after you paste the JSON)

Once I have your `lead_id`, I run **one** SQL block tagged for rollback:

```sql
-- TAGGED FOR ROLLBACK: source=manual_pr1_validation
INSERT INTO lead_entitlements (lead_id, product_code, metadata)
VALUES ('<your_lead_id>', 'report_full_9',
        '{"source":"manual_pr1_validation","granted_at":"<T0>"}');
INSERT INTO credit_ledger (lead_id, delta, reason, metadata)
VALUES ('<your_lead_id>', 1, 'manual_topup',
        '{"source":"manual_pr1_validation"}');
-- new balance = 2 → enough for scenario 2 (1 credit) + safety margin
```

Then I record `T0 := now()` and capture pre-state row counts.

#### Scenario execution (you, in the browser)

Run in this order, **same tab**, no reload between steps:

| # | Action | Expected HTTP | Expected DB delta |
|---|---|---|---|
| 1 | **Baseline:** Open `/analyze/frederico.m.carvalho` (no `?vs=`, no period chip). | 200, cache hit | 0 ledger rows, 0 provider calls, 1 `analysis_event` with `data_source=cache`, `cache_key=v1:frederico.m.carvalho\|` |
| 2 | **Pro 30d first call:** In sidebar, click the **30d** period chip. | 200, fresh | -1 reserve + 0 confirm in `credit_ledger`, 1 `provider_call_logs` row (apify, instagram, ~3-8s), 1 new snapshot `v1:frederico.m.carvalho\|:w=30d`, 1 `analysis_event` with `data_source=fresh`. May enqueue 1 `enrichment_jobs` (OpenAI/DFS) per existing policy — acceptable. |
| 3 | **Pro 30d repeat:** Click 30d again (or reload the URL). | 200, cache hit | 0 new ledger rows, 0 new provider calls, 1 new `analysis_event` with `data_source=cache`, same `cache_key`. |
| 4 | **Free 30d:** I revoke `report_full_9` from your lead via SQL (rollback only the entitlement, keep the topup). You click 30d again. | **403 `WINDOW_REQUIRES_PRO`** | 0 ledger rows, 0 provider calls, 1 `analysis_event` with `outcome=blocked_pro_gate` (or equivalent). |

Tell me "step N done" after each, and I run the SQL deltas. If any scenario fails I stop the chain immediately.

**Skipped:** 90d (Apify cost ≤ $0.30, not justified for this round).

#### Scoring (me, after step 4)

I run these five queries scoped to `created_at >= T0` and the lead:

```sql
SELECT * FROM credit_ledger        WHERE lead_id=$1 AND created_at>=$T0 ORDER BY created_at;
SELECT cache_key, instagram_username, created_at FROM analysis_snapshots
  WHERE cache_key LIKE 'v1:frederico.m.carvalho%' AND created_at>=$T0;
SELECT created_at, outcome, data_source, cache_key, error_code, posts_returned
  FROM analysis_events WHERE handle='frederico.m.carvalho' AND created_at>=$T0;
SELECT created_at, provider, actor, status, posts_returned, estimated_cost_usd, apify_run_id
  FROM provider_call_logs WHERE handle='frederico.m.carvalho' AND created_at>=$T0;
SELECT id, snapshot_id, enrichment_type, status FROM enrichment_jobs
  WHERE handle='frederico.m.carvalho' AND created_at>=$T0;
```

Then I emit a PASS/FAIL row per scenario, total Apify cost, and a go/no-go recommendation for PR2.

#### Rollback (me, immediately after scoring — single SQL block)

```sql
DELETE FROM lead_entitlements
  WHERE lead_id='<your_lead_id>'
    AND product_code='report_full_9'
    AND metadata->>'source'='manual_pr1_validation';
-- Topup credits are NOT removed (would orphan reserve/confirm rows from scenario 2).
-- The +1 manual_topup remains in the ledger; balance ends ≥1 (still beta-safe).
```

I post a final state snapshot of the lead so you can audit.

### What I'm NOT doing

- No `INTERNAL_API_TOKEN` bypass anywhere.
- No checkout, EuPago, pricing, schema, report generation, UI or Free-flow changes.
- No 90d call.
- No deletion of `credit_ledger` rows (would break the reserve/confirm audit trail). The +1 manual topup is left behind by design.

### Decision point you control

If you'd rather NOT grant any temporary entitlement (zero-write strategy), the only PR1 surface still validatable end-to-end is scenario 1 (baseline) + scenario 4 (Free 30d on a lead without entitlement). Scenarios 2 & 3 cannot be exercised without granting `report_full_9` — there is no read-only equivalent. Tell me which path you want before I switch to build mode.

### What I need from you next

Paste the JSON from `/api/debug/lead-session-status` so I can confirm which lead your browser is bound to. Once confirmed, I'll switch to build mode and run the setup SQL.
