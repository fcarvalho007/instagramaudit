# Smoke test — EuPago checkout for `authority_diagnosis_97`

Read-only validation that the checkout call works end-to-end up to (but not through) the EuPago payment page. No code edits, no payment completion.

## Pre-flight (read-only, ~30s)
1. `supabase--read_query` — confirm product is server-side configured:
   - `SELECT key, label, price_cents, currency, active FROM pricing_plans WHERE key ILIKE '%authority_diagnosis_97%' OR label ILIKE '%diagn%';`
   - Also grep `src/lib/payments/products.ts` (or equivalent) for `authority_diagnosis_97` to confirm `amount_cents = 9700`.
2. Snapshot baseline counts:
   - `SELECT count(*) FROM lead_payments WHERE product = 'authority_diagnosis_97' AND status = 'pending';`
   - `SELECT count(*) FROM lead_entitlements WHERE product_code = 'authority_diagnosis_97';`
3. `supabase--read_query` on `app_config` / secrets check — confirm EuPago env vars are set (`EUPAGO_API_KEY`, `EUPAGO_CHANNEL_ID`, `EUPAGO_BASE_URL`, `EUPAGO_WEBHOOK_SECRET` already listed in project secrets).

## Browser smoke (one happy path)
4. `browser--navigate_to_sandbox` to the preview, viewport 1440×900.
5. Open a recent report URL that already has a `lead_session` (pull most recent ready snapshot via `supabase--read_query` on `analysis_snapshots` + `lead_reports`).
6. Trigger the premium access modal (scroll to a locked block or click an unlock CTA).
7. `browser--list_network_requests` baseline, then click **Reservar diagnóstico** via `browser--act`.
8. `browser--list_network_requests` filter for the checkout endpoint (likely `/api/_serverFn/*reserveDiagnosis*` or similar). Capture request + response with `browser--get_network_request_details`.
9. Read the response body — it must include a `checkout_url` (Pay By Link domain). **Do not navigate to it.**

## DB / entitlement verification
10. `supabase--read_query`:
    - Newest `lead_payments` row for `product = 'authority_diagnosis_97'` — verify `amount_cents = 9700`, `currency = 'EUR'`, `status = 'pending'`, `provider = 'eupago'`, `lead_id IS NOT NULL`, `provider_checkout_url IS NOT NULL`.
    - `SELECT count(*) FROM lead_entitlements WHERE lead_id = <that lead_id> AND product_code = 'authority_diagnosis_97';` — must be 0 (no entitlement before webhook).
11. `SELECT event_type, metadata, created_at FROM product_events WHERE lead_id = <that lead_id> ORDER BY created_at DESC LIMIT 10;` — confirm `payment_cta_clicked` and `payment_checkout_created` are present.

## Provider isolation
12. `supabase--read_query` `provider_call_logs WHERE created_at > <test start>` — confirm no `apify` / `openai` / `dataforseo` calls fired during the click.

## Server-side logs
13. `stack_modern--server-function-logs` filtered by `eupago` / `createEupagoCheckout` for the test window — capture any warnings.

## Error path
- If checkout returns 401: print response body verbatim (mask key), inspect endpoint path, `Authorization` header shape, channel id mismatch.
- If 400: print EuPago error code + sanitized payload, identify which field (amount, channel, callback URL, identifier).

## Output report
- Request sequence (URL, method, status).
- The new `lead_payments` row (id, amount, status, checkout URL host).
- EuPago response shape (top-level keys only, no secrets).
- Checkout URL domain.
- Entitlement count (should remain 0).
- Tracking events found.
- Verdict: **READY FOR LIVE PAYMENT** / **NEEDS FIX** / **BLOCKED** + minimal next action.

## Guardrails
- No code edits, no migrations, no secret changes.
- I will NOT click anything on the EuPago Pay By Link page.
- I will NOT POST to `/api/public/eupago-webhook` myself (that would forge a paid state).
- The single side-effect on the DB is one `lead_payments` row in `status = 'pending'` and the two tracking events — expected and harmless.
