
# Controlled live payment test — EuPago `authority_diagnosis_97`

This plan executes one real €97 payment end-to-end to validate:
**payment completion → EuPago webhook → `lead_payments.status=paid` → `lead_entitlements` granted → `product_events` recorded → idempotency.**

No code, secrets, DB rows, or webhook payloads will be modified or forged. The only state change comes from the real EuPago payment and its real webhook callback.

---

## Pre-flight (read-only, before you confirm)

Before opening the browser session I will:

1. `supabase--cloud_status` — confirm backend `ACTIVE_HEALTHY`.
2. Confirm `EUPAGO_BASE_URL`, `EUPAGO_API_KEY`, `EUPAGO_CHANNEL_ID`, `EUPAGO_WEBHOOK_SECRET`, `APP_BASE_URL` are all set (presence-only check, no values printed).
3. Snapshot baseline counts:
   - `SELECT count(*) FROM lead_payments WHERE product='authority_diagnosis_97' AND status='paid'`
   - `SELECT count(*) FROM lead_entitlements WHERE product_code='authority_diagnosis_97'`
   - latest `product_events` of types `payment_webhook_paid` / `payment_webhook_failed`.

These are pure reads — no state change.

---

## Required confirmation before I proceed

I will **stop here and ask** before doing anything that costs money. You must confirm:

- [ ] You authorize charging **€97,00** to a real payment method (MB WAY / Multibanco / card) on the live EuPago Pay By Link.
- [ ] You will perform the actual payment yourself in the browser (I cannot enter MB WAY PINs, card numbers, or confirm MB references).
- [ ] You accept that an entitlement will be permanently granted to the test lead (idempotency guarantees no duplicate, but the row will exist).
- [ ] Optional: confirm you want me to run this against the **preview** sandbox (so webhook hits the preview URL configured in `APP_BASE_URL`) — and that `APP_BASE_URL` currently points to the host whose `/api/public/eupago-webhook` you want to validate.

If any box is not ticked, I will NOT proceed.

---

## Execution sequence (after confirmation)

### A. Create the checkout (driven by the real UI)

1. `browser--navigate_to_sandbox` → `/` (desktop viewport).
2. Complete onboarding to create a lead session (or reuse current session if `__Host-lead` cookie already present).
3. Navigate `/checkout/authority-diagnosis` → fill Steps 1-4 → click **"Confirmar e pagar"**.
4. Capture the network call to `createEupagoCheckout` → record:
   - `payment_id` (UUID)
   - `provider_payment_id`
   - `provider_checkout_url` (must be `clientes.eupago.pt/...`)
5. Immediately query and record **payment row BEFORE payment**:
   ```sql
   SELECT id, lead_id, status, paid_at, provider, provider_payment_id,
          provider_checkout_url, amount_cents, currency, metadata, created_at
   FROM lead_payments WHERE id = :payment_id;
   ```
   Expected: `status='pending'`, `paid_at IS NULL`, `amount_cents=9700`.

### B. You complete the payment

6. Browser opens the EuPago Pay By Link page. **You** complete the payment manually with your chosen method.
7. I will **not** interact with the EuPago page beyond observing — no field fills, no clicks on payment confirmations.

### C. Wait for webhook + validate (polling, read-only)

8. Poll every ~5s for up to 3 minutes:
   ```sql
   SELECT status, paid_at, provider_payment_id
   FROM lead_payments WHERE id = :payment_id;
   ```
9. Once `status='paid'`, capture **payment row AFTER webhook** and assert:
   - `status = 'paid'`
   - `paid_at IS NOT NULL`
   - `provider_payment_id` unchanged (stable)
   - `provider_checkout_url` still present
10. Query **entitlement**:
    ```sql
    SELECT id, lead_id, product_code, payment_id, granted_at, metadata
    FROM lead_entitlements
    WHERE lead_id = :lead_id AND product_code = 'authority_diagnosis_97';
    ```
    Assert exactly **one** row, `payment_id` matches.
11. Query **product_events** for this payment:
    ```sql
    SELECT event_type, created_at, metadata
    FROM product_events
    WHERE metadata->>'payment_id' = :payment_id
    ORDER BY created_at;
    ```
    Assert `payment_webhook_paid` present, `payment_webhook_failed` absent.

### D. Idempotency check (best-effort, no forging)

12. Check whether EuPago naturally re-delivers (some methods send a confirmation + a settlement webhook). Re-query after 60s:
    - entitlement count for `(lead_id, product_code)` MUST still be exactly 1.
    - `lead_payments.status` MUST still be `paid` (no downgrade).
    - `lead_payments.paid_at` MUST NOT advance on re-delivery.
13. I will NOT manually re-POST the webhook (would require forging HMAC). Idempotency from natural re-delivery is reported as "observed / not observed in window".

### E. User-facing state

14. Return to the app, verify the UI does not show a generic failure. Capture screenshot of the post-payment state (success / processing / report unlock — whichever the current implementation renders).

---

## Output I will deliver

A structured report with:

- Full request/payment sequence (timestamps).
- `payment row BEFORE payment` (JSON).
- `payment row AFTER webhook` (JSON).
- `entitlement row` (JSON).
- `product_events` for this `payment_id` (list).
- Idempotency observation (observed re-delivery? duplicate prevented? state stable?).
- User-facing screenshot + verbal confirmation.
- **Verdict:** `READY TO SELL` / `NEEDS FIX` / `BLOCKED` — with reasons and any P0/P1 follow-ups.

---

## Hard guarantees

- No source files will be edited.
- No secrets will be added, updated, or read by value.
- No `INSERT`/`UPDATE`/`DELETE` on `lead_payments`, `lead_entitlements`, `product_events`, `leads`, or any other table.
- No manual webhook POST / HMAC forgery.
- If the webhook does not arrive within 3 minutes, I stop and report `BLOCKED — webhook not delivered` along with diagnostics (EuPago dashboard pointer, `APP_BASE_URL` value masked, recent server logs for `/api/public/eupago-webhook`).

---

## Please confirm to proceed

Reply with **"Confirmo, avançar"** (and tell me which environment — **preview** or **published `auditprofiles.com`**) and I will switch to build/test mode and execute. Any other reply pauses execution.
