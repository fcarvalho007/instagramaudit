## Goal
Validate one real EuPago Pay By Link payment for product `authority_diagnosis_97`, end-to-end, with no code or DB changes. The agent only collects evidence; the user performs the human steps (creating the lead session, clicking the checkout, paying at EuPago).

## Pre-flight findings (already gathered, read-only)

**Product configuration (code, not DB)**
- `src/lib/payments/products.ts` → `authority_diagnosis_97` exposed, label "97€", strike "149€".
- `src/lib/payments/products.server.ts` → 9700 cents EUR, description "Diagnóstico de Autoridade Digital — relatório completo + sessão humana de 30 min + 3 prioridades."
- `pricing_plans` table has no row for this key — pricing is sourced from `products.server.ts`, which is the documented source of truth, so this is expected, not a defect.

**Historical `lead_payments` (product = `authority_diagnosis_97`)**
- 4 rows total. 1 `pending` (2026-06-03 20:23, provider `eupago`, provider_payment_id `713447afafe74a089e8619c3a5986b0b`), 3 `failed` (no provider_payment_id).
- 0 rows ever reached `paid`. 0 entitlements granted. 0 `payment_ln_paid` events.

**Webhook surface**
- Handler: `src/routes/api/public/eupago-webhook.ts`.
- Live route: `/api/public/eupago-ln`. Legacy alias `/api/public/ln-webhook` also exported.
- On success it emits product event `payment_ln_paid` (NOT `payment_webhook_paid` as the brief states — the brief's event name is wrong; the actual name to look for is `payment_ln_paid`).
- On failure: `payment_ln_failed`.

## Validation procedure

### Step A — User-side: create a controlled checkout
User performs these in the browser, signed in or with a fresh lead session:
1. Visit `/checkout/authority-diagnosis` (optionally with `?username=<handle>`).
2. Use a real, unique email so we can isolate the new row.
3. Complete steps 1→4 in the flow until EuPago Pay By Link opens in a new tab.
4. **Tell the agent the exact email used** so we can locate the lead + payment row precisely.

### Step B — Agent verification: payment created, status `pending`
Agent will run:
```sql
SELECT lp.id, lp.lead_id, l.email_normalized, lp.status, lp.amount_cents,
       lp.provider, lp.provider_payment_id, lp.provider_checkout_url,
       lp.checkout_started_at, lp.paid_at, lp.created_at
FROM lead_payments lp
JOIN leads l ON l.id = lp.lead_id
WHERE lp.product = 'authority_diagnosis_97'
  AND l.email_normalized = lower('<email-from-user>')
ORDER BY lp.created_at DESC LIMIT 5;
```
Pass criteria: 1 fresh row, `status='pending'`, `amount_cents=9700`, `provider='eupago'`, `provider_payment_id` non-null, `provider_checkout_url` non-null.

Also confirm tracking:
```sql
SELECT event_type, created_at, metadata
FROM product_events
WHERE lead_id = '<lead_id>' AND event_type IN
  ('payment_cta_clicked','payment_checkout_created','checkout_payment_started','payment_checkout_failed')
ORDER BY created_at DESC LIMIT 20;
```
Pass: `payment_checkout_created` present, no `payment_checkout_failed` for this attempt.

If any of these fail → STOP, report failure point, do not pay.

### Step C — User-side: pay at EuPago
User completes the real card payment in the EuPago Pay By Link tab. After confirmation, user pings the agent to continue.

### Step D — Agent verification: webhook received, payment transitioned
Agent polls (≤ a few minutes after payment):
```sql
SELECT id, status, paid_at, provider_reference, updated_at, metadata
FROM lead_payments
WHERE id = '<payment_id_from_step_B>';
```
Pass: `status='paid'`, `paid_at` not null, `updated_at` > `created_at`. (Recording `metadata` and `provider_reference` for evidence.)

Webhook evidence (raw delivery + edge log):
```sql
-- HTTP-level evidence of EuPago hitting the public route
select id, timestamp, event_message, response.status_code, request.method, request.url
from function_edge_logs
  cross join unnest(metadata) as m
  cross join unnest(m.response) as response
  cross join unnest(m.request) as request
where request.url like '%eupago-ln%' or request.url like '%ln-webhook%'
order by timestamp desc limit 20;
```
Plus `stack_modern--server-function-logs` filtered by `eupago-ln` to capture any handler-side log lines (signature accepted, payment matched).

Pass: at least one POST 200 to `/api/public/eupago-ln` within the payment window; no error lines for that request.

### Step E — Agent verification: entitlement + tracking
```sql
SELECT id, lead_id, product_code, payment_id, granted_at, metadata
FROM lead_entitlements
WHERE lead_id = '<lead_id>' AND product_code = 'authority_diagnosis_97'
ORDER BY granted_at DESC;
```
Pass: exactly 1 row, `payment_id` = the payment row from Step B, granted_at within the webhook window.

```sql
SELECT event_type, created_at, metadata
FROM product_events
WHERE lead_id = '<lead_id>'
  AND event_type IN ('payment_ln_paid','payment_ln_failed')
ORDER BY created_at DESC;
```
Pass: exactly 1 `payment_ln_paid`, 0 `payment_ln_failed` for this attempt.

### Step F — Idempotency check
Agent re-runs the entitlement query 60s later. Pass: still exactly 1 row (no duplicate from a retry).
If EuPago re-delivered the webhook, also re-check `lead_payments` did not regress or duplicate.

### Step G — User-facing state
User refreshes the return/success page (the `return` param sent in step 1, or `/checkout/authority-diagnosis` with the same lead session) and reports what they see. Agent verifies it matches the entitlement state (success/unlocked, not "pending").

## Evidence the agent will report
1. **Product configuration summary** — from `products.ts` / `products.server.ts` (already captured above).
2. **Payment row before payment** — full row from Step B.
3. **Payment row after webhook** — full row from Step D.
4. **Webhook evidence** — edge log line(s) + server-function-logs lines for that request id / timestamp.
5. **Entitlement row evidence** — row from Step E.
6. **Tracking event evidence** — `payment_ln_paid` row.
7. **Idempotency** — second snapshot from Step F.
8. **User-facing state** — what the UI showed.

## Final verdict rubric
- All Step D/E/F/G pass cleanly → **READY TO SELL**.
- Webhook delivered but mapping fails (e.g. payment not transitioned, no entitlement, duplicate entitlement, wrong event name, or UI still shows pending) → **NEEDS FIX**, with the exact failing step.
- Webhook never arrives within ~10 minutes, signature rejected, or EuPago Pay By Link never opens → **BLOCKED** (EuPago config / network), with the exact failing step.

## Discrepancy to flag in the final report
The brief asks to confirm event `payment_webhook_paid`. The handler actually emits `payment_ln_paid`. The validation will look for `payment_ln_paid`; if the user insists the name should be `payment_webhook_paid` that is a code-side decision (and out of scope for this read-only run).

## What I need from the user to proceed
1. Confirmation to start.
2. The exact email used when going through `/checkout/authority-diagnosis`.
3. A ping immediately after paying at EuPago (so I poll at the right time).