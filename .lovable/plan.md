# QA setup — Add Competitor with entitlement (read-only plan)

## 1. Recommended QA lead

| Field | Value |
|---|---|
| Lead ID | `01bf861c-6a17-4b36-81b7-130ef2f143da` |
| Email | `frederico.carvalho@digitalfc.pt` |
| Name | Fomentar Sonhos |
| Created | 2026-06-06 17:06:35Z |
| Credit balance | **1** (initial_grant +2 → reserve −1 → confirm 0) |
| Most recent snapshot | `683e4c21-60e0-4045-b43a-dfcd85fe9896` (`frederico.m.carvalho`, expires 2026-06-07 08:51:30Z — still inside 24h cache) |
| Why this lead | Project-owner test lead, already inside `APIFY_ALLOWLIST`, fresh cache for own handle (no Apify call needed for the primary), has 1 confirmable credit, no historical `report_full_9` entitlement to confuse rollback. |

## 2. Lead-session path

- The `lead_session` is a signed HTTP cookie set by `POST /api/onboarding/start` → `setLeadCookie(leadId)` (`src/routes/api/onboarding/start.ts:364`).
- It is **not** stored server-side and **not** re-issuable by SQL. To get a valid `lead_session` on the QA browser, the operator must run the onboarding flow once for this lead (or already hold the cookie). Verify with `GET /api/debug/lead-session-status` before clicking "Adicionar concorrente".
- Production cookie domain only — preview cannot share a production-issued `lead_session`. See §6.

## 3. Credit balance

- Required: **≥ 1** (Add Competitor consumes one credit reservation, same as the primary analyze flow).
- Current: **1** ✓ — no top-up needed.
- Do not pre-debit anything before QA.

## 4. Entitlement row needed

Schema: `lead_entitlements(lead_id, product_code, payment_id NULLABLE, metadata jsonb)`, unique on `(lead_id, product_code)`.

Required row:
```
lead_id      = 01bf861c-6a17-4b36-81b7-130ef2f143da
product_code = report_full_9
payment_id   = NULL
metadata     = {"source":"qa_manual","reason":"add_competitor_runtime_qa","granted_by":"<operator>","granted_at":"<ISO ts>"}
```

`payment_id` is nullable in the table; the typed helper `grantEntitlement` requires it, so we must insert via raw SQL, not via the helper.

This is the **only** row required. No `lead_payments`, no `coupon_redemptions`, no schema change.

## 5. Insert + rollback recipes

Will be executed in a later "Execute" turn. Do not run now.

### Insert (one row)
```sql
INSERT INTO public.lead_entitlements
  (lead_id, product_code, payment_id, metadata)
VALUES
  ('01bf861c-6a17-4b36-81b7-130ef2f143da',
   'report_full_9',
   NULL,
   jsonb_build_object(
     'source','qa_manual',
     'reason','add_competitor_runtime_qa',
     'granted_at', now()::text
   ));
```

### Rollback (only the QA row)
```sql
DELETE FROM public.lead_entitlements
WHERE lead_id      = '01bf861c-6a17-4b36-81b7-130ef2f143da'
  AND product_code = 'report_full_9'
  AND payment_id   IS NULL
  AND metadata->>'source' = 'qa_manual';
```

The `metadata->>'source' = 'qa_manual'` filter is the safety net: even if a real `payment_id IS NULL` entitlement is later inserted by another flow, the rollback will not touch it.

## 6. Preview vs production

**Production (`auditprofiles.com`).** Reasons:
- The candidate lead, its `lead_session` cookie, the fresh snapshot cache and the `APIFY_ALLOWLIST` value are all bound to the production environment. Preview has no shared session.
- We want to validate the real `premiumUnlocked` gate in `src/routes/api/public/analysis-snapshot.$username.ts:93` against the real lead.

QA window must be short (≤ 30 min) to minimise the time `report_full_9` is artificially granted.

## 7. Competitor handle

Pick **`mariiana.ai`**:
- Confirmed in `APIFY_ALLOWLIST` (previous validation).
- Fresh snapshot exists from today's earlier run (snapshot `63c045bd-…`, created 2026-06-06 18:29:26Z, well inside the 24h cache).
- Therefore Add Competitor will resolve from cache → **0 Apify calls, 0 USD spend**.

Backup competitor (only if cache miss): `martimsilvai` — also allowlisted, stale snapshot from May, would trigger one real Apify scrape. Avoid unless mariiana cache somehow misses.

## 8. Rollback plan

In this exact order, immediately after the QA pass:

1. Run the rollback `DELETE` from §5.
2. Verify with the post-check query in §"Exact pre-check / post-check SQL" below (expected row count: 0).
3. Re-run the credit ledger check: `SUM(delta)` for the lead should be 0 if the Add Competitor consumed 1 credit, or 1 if the gate short-circuited. Capture the value either way — do NOT compensate manually.
4. Verify `provider_call_logs` count since QA T0 (should be 0 if cache hit, 1 Apify success row if cache miss on competitor).
5. Confirm no new rows in `lead_payments` or `coupon_redemptions` since QA T0.

If anything looks unexpected at step 4 or 5, stop and report — do not run any compensating writes.

## Exact pre-check / post-check SQL

Pre-check (run before insert):
```sql
SELECT COUNT(*) AS existing_report_full_9
FROM public.lead_entitlements
WHERE product_code = 'report_full_9';   -- expect 0

SELECT id, email_normalized, created_at
FROM public.leads
WHERE id = '01bf861c-6a17-4b36-81b7-130ef2f143da';   -- expect 1 row

SELECT COALESCE(SUM(delta),0) AS balance
FROM public.credit_ledger
WHERE lead_id = '01bf861c-6a17-4b36-81b7-130ef2f143da';   -- expect 1

SELECT id, expires_at
FROM public.analysis_snapshots
WHERE instagram_username = 'mariiana.ai'
  AND expires_at > now()
ORDER BY created_at DESC LIMIT 1;   -- expect 1 row (cache hit guaranteed)
```

Post-check (run after rollback):
```sql
SELECT COUNT(*) AS remaining_qa_rows
FROM public.lead_entitlements
WHERE lead_id = '01bf861c-6a17-4b36-81b7-130ef2f143da'
  AND product_code = 'report_full_9';   -- expect 0

SELECT COUNT(*) AS new_payments
FROM public.lead_payments
WHERE created_at >= '<QA_T0>';   -- expect 0

SELECT COUNT(*) AS apify_calls
FROM public.provider_call_logs
WHERE created_at >= '<QA_T0>'
  AND provider = 'apify';   -- expect 0 (cache) or 1 (cache miss)
```

## Safest execution prompt for the next step

> Execute the Add Competitor runtime QA in production.
>
> Spend cap: 0 Apify calls (cache-only via competitor `mariiana.ai`); accept up to 1 Apify scrape only if `mariiana.ai` snapshot is no longer cached.
> No OpenAI, no DataForSEO, no payment, no coupon, no schema change.
>
> 1. Record `T_QA0 = now()`.
> 2. Run the four pre-check queries in §"Exact pre-check / post-check SQL" and confirm all expected counts.
> 3. INSERT the single `lead_entitlements` row from §5 (QA marker metadata).
> 4. Operator opens the production report as lead `01bf861c-6a17-4b36-81b7-130ef2f143da` with a valid `lead_session` cookie. If the cookie is missing, complete `POST /api/onboarding/start` once for this lead. Confirm via `GET /api/debug/lead-session-status`.
> 5. Click "Adicionar concorrente" → enter `mariiana.ai` → submit.
> 6. Capture: UI state (loading → resolved), `premiumUnlocked` resolution path, credit_ledger delta, provider_call_logs delta, any error toast.
> 7. Run the rollback DELETE from §5.
> 8. Run the three post-check queries and report deltas.
> 9. Verdict: PASS / FAIL with what was observed in step 6 and any non-zero unexpected deltas in step 8.

Awaiting approval to switch to build mode and execute steps 1–9.
