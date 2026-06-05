
# Controlled live payment test — `report_full_9` (9€)

Read-only orchestration. No code, no secrets, no DB writes, no webhook forging.

## Preconditions (already met)
- `/api/debug/lead-session-status` in the live browser returned: `has_lead_session_cookie=true`, `decoded_cookie_valid=true`, `lead_exists=true`, `request_host=auditprofiles.com`.
- Same browser session will be reused for checkout.
- We have the `lead_id` (from cookie diagnostic, prefix `021a9e49…` per earlier probe; will reconfirm via `lookup-lead` / DB by prefix).

## Step 1 — Capture baseline (DB, read-only)
For the active `lead_id`:

```sql
-- A. Existing payments for this lead + product (should be empty or only old non-paid)
SELECT id, product, amount_cents, currency, status, provider,
       provider_payment_id, provider_checkout_url IS NOT NULL AS has_url,
       paid_at, expired_at, created_at
FROM   lead_payments
WHERE  lead_id = :lead_id
ORDER  BY created_at DESC
LIMIT  20;

-- B. Existing entitlements (must NOT contain report_full_9)
SELECT id, product_code, payment_id, granted_at
FROM   lead_entitlements
WHERE  lead_id = :lead_id;

-- C. Recent product_events for this lead
SELECT event_type, created_at, metadata
FROM   product_events
WHERE  lead_id = :lead_id
ORDER  BY created_at DESC
LIMIT  20;

-- D. Credit balance snapshot
SELECT public.credit_balance(:lead_id);
```

Record results as **BEFORE** snapshot.

## Step 2 — User action in the live browser
The user:
1. Navigates to `https://auditprofiles.com/checkout/report-full` (same tab).
2. Completes the checkout form, declines the upsell.
3. Clicks "Reservar / Comprar" → `createEupagoCheckout` server fn runs.
4. Stops on the EuPago hosted page (does NOT pay yet).

## Step 3 — Pre-payment verification (DB, read-only)
Immediately after the redirect to EuPago, before paying:

```sql
SELECT id, product, amount_cents, currency, status, provider,
       provider_payment_id, provider_checkout_url,
       paid_at, created_at, metadata
FROM   lead_payments
WHERE  lead_id = :lead_id
  AND  product = 'report_full_9'
ORDER  BY created_at DESC
LIMIT  1;
```

Expected:
- `product = 'report_full_9'`
- `amount_cents = 900`
- `currency = 'EUR'`
- `status = 'pending'`
- `provider = 'eupago'`
- `provider_checkout_url` present (non-null)
- `paid_at IS NULL`
- and: still NO `lead_entitlements` row for `report_full_9`.

If any of the above fails → **abort, do not pay**, report `NEEDS FIX` with the offending field.

Also confirm no side-effect provider calls during checkout creation:

```sql
SELECT provider, actor, source_context, status, created_at
FROM   provider_call_logs
WHERE  created_at >= :baseline_time
  AND  source_context = 'public_analysis';
-- expect: 0 rows for this window
```

## Step 4 — User completes real 9€ payment on EuPago
User pays with their own card on the EuPago hosted page. No automation, no forging. They return to whatever success URL EuPago redirects to.

## Step 5 — Poll for webhook (DB, read-only)
Poll the same payment row every ~5s for up to ~2 min:

```sql
SELECT id, status, paid_at, provider_payment_id, updated_at
FROM   lead_payments
WHERE  id = :payment_id;
```

Stop polling when `status = 'paid'` AND `paid_at IS NOT NULL`.

Then verify the rest:

```sql
-- Entitlement: exactly one row for report_full_9
SELECT id, product_code, payment_id, granted_at
FROM   lead_entitlements
WHERE  lead_id = :lead_id
  AND  product_code = 'report_full_9';
-- expect: exactly 1 row, payment_id = :payment_id

-- Webhook event recorded
SELECT event_type, metadata, created_at
FROM   product_events
WHERE  lead_id = :lead_id
  AND  event_type = 'payment_webhook_paid'
ORDER  BY created_at DESC
LIMIT  5;
-- expect: at least 1 row with metadata.payment_id = :payment_id

-- No duplicate entitlement
SELECT product_code, COUNT(*) AS n
FROM   lead_entitlements
WHERE  lead_id = :lead_id
GROUP  BY product_code
HAVING COUNT(*) > 1;
-- expect: 0 rows

-- No provider spend triggered by webhook
SELECT provider, actor, source_context, status, created_at
FROM   provider_call_logs
WHERE  created_at >= :baseline_time
  AND  source_context IN ('public_analysis','enrich_comments');
-- expect: 0 rows
```

If admin session is available, also open `/admin/receita` to confirm the 9€ row appears.

## Step 6 — Verdict
Emit one of:
- **READY TO SELL 9€** — all pre-checks and post-checks passed; entitlement granted exactly once; webhook event present; no provider spend.
- **NEEDS FIX** — payment row reached `paid` but one of: missing entitlement, duplicate entitlement, missing `payment_webhook_paid`, wrong amount/product, unexpected provider spend. Report which.
- **BLOCKED** — payment row never flipped to `paid` within the poll window, OR pre-payment row failed validation and we aborted before paying.

## Idempotency safety
If the webhook is re-delivered (EuPago retries), the route handler in `src/routes/api/public/eupago-webhook.ts` already:
- short-circuits when `row.status === 'paid' && row.paid_at` is set,
- relies on `lead_entitlements (lead_id, product_code)` unique constraint via `grantEntitlement` to silently no-op on 23505.

We rely on this; we do not need to re-test re-delivery in this run.

## What I will NOT do
- Will not edit any source file.
- Will not insert/update any DB row.
- Will not call EuPago / webhook endpoints directly.
- Will not change secrets, RLS, or migrations.

## Inputs I still need from you before executing
1. The exact `lead_id` (full UUID) of the production session that just passed the cookie diagnostic — so I can scope all queries safely. If you'd rather, give me the cookie's `lead_id_prefix` plus the lead's email and I'll resolve it via `leads` read-only.
2. Confirmation that you (the human) are ready to pay 9€ with a real card on the EuPago page when I tell you "pre-checks passed, proceed to pay".
