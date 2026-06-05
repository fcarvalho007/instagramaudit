# Smoke test plan — /checkout/report-full upsell

I'm in plan mode, so I can't drive the browser or create `lead_payments` rows yet. This plan describes exactly what I'll run once you switch to build/smoke mode. Nothing here completes payment, forges webhooks, or writes to the DB by hand.

## Preconditions to verify first (read-only)

1. `supabase--read_query` — confirm schema is ready:
   - `lead_payments` columns: `lead_id`, `product_code`, `amount_cents`, `currency`, `provider`, `status`, `provider_checkout_url`, `metadata`, `created_at`
   - `lead_entitlements` exists, current row count for the test lead = 0
2. `code--view src/lib/payments/eupago.functions.ts` — re-confirm the metadata keys (`source_product`, `target_product`, `final_product`, `upsell_presented`, `upsell_accepted`, `upsell_from`, `upsell_to`) are written exactly as the spec expects.
3. Baseline counts before each test:
   ```sql
   select count(*) from lead_payments where lead_id = :lead;
   select count(*) from lead_entitlements where lead_id = :lead;
   select count(*) from provider_call_logs where created_at > now() - interval '5 min';
   ```

## Test A — Decline upsell (final = report_full_9)

Browser sequence (`browser--view_preview` + `browser--act`):

1. `view_preview path=/checkout/report-full?source=smoke_test_a` (1440×900) — assumes an active lead session from the current preview cookie. If `MissingLeadSession` renders, stop and report BLOCKED.
2. Step 1: click **Continuar**.
3. Step 2: select a `report_priority` option, click **Continuar**.
4. Step 3: click **Continuar só com o relatório de 9€** (the underlined decline link).
5. Step 4: fill `BillingForm` (name, address, postal_code, city, invoice_email; tax_id optional).
6. `browser--list_network_requests` + `browser--read_console_logs` armed.
7. Click **Confirmar e pagar** exactly once. Observe that the button enters the `A preparar pagamento…` disabled state (prevents double-submit).
8. Capture the redirect URL — assert host = `clientes.eupago.pt`.
9. Immediately navigate away (do NOT complete payment).

Read-only DB assertions:

```sql
select id, product_code, amount_cents, currency, provider, status,
       provider_checkout_url is not null as has_url,
       lead_id, metadata, created_at
from lead_payments
where lead_id = :lead
order by created_at desc
limit 1;
```

Expected: `report_full_9`, `900`, `EUR`, `eupago`, `pending`, `has_url=true`, `lead_id` joins to `leads.id`, and metadata contains:
- `report_priority` = chosen value
- `upsell_presented` = true
- `upsell_accepted` = false
- `source_product` = `report_full_9`
- `final_product` = `report_full_9`

Plus:
```sql
select count(*) from lead_entitlements where lead_id = :lead;  -- expect 0
select count(*) from provider_call_logs where created_at > :t0; -- expect 0
select event_type, metadata->>'final_product' from product_events
where lead_id = :lead and created_at > :t0 order by created_at;
```
Expected events: `checkout_started`, `checkout_step_view`×4, `checkout_upsell_seen`, `checkout_upsell_declined`, `checkout_payment_started`, `payment_checkout_created`.

## Test B — Accept upsell (final = authority_diagnosis_97)

Same as Test A with two changes:
- Use a fresh preview session (incognito or different lead) to avoid mixing with Test A's row.
- Step 3: click **Sim, quero diagnóstico humano** instead of the decline link.

Expected newest `lead_payments`: `authority_diagnosis_97`, `9700`, `EUR`, `pending`, metadata with:
- `upsell_presented` = true, `upsell_accepted` = true
- `source_product` = `report_full_9`
- `target_product` = `authority_diagnosis_97`
- `final_product` = `authority_diagnosis_97`
- `upsell_from` = `report_full_9`
- `upsell_to` = `authority_diagnosis_97`
- `report_priority` present

Expected events include `checkout_upsell_accepted` instead of `_declined`.

## Cross-cutting checks (both tests)

- `browser--read_console_logs` filtered for `error`, `FK`, `lead_id` → expect empty.
- No duplicate `lead_payments` row created within 5s of click (re-run the `limit 1` query and compare `id`).
- `provider_call_logs` count delta = 0 (proves Apify/OpenAI/DataForSEO are not touched by checkout).
- `stack_modern--server-function-logs search=createEupagoCheckout` to confirm a single server invocation per test and no thrown errors.

## Output I'll deliver after running

1. Request sequence per test (browser steps + server fn calls).
2. The newest `lead_payments` row (id, product, amount, status, metadata JSON).
3. `lead_entitlements` count before/after (must stay 0).
4. Provider isolation result (provider_call_logs delta).
5. Tracking events emitted (ordered list).
6. Verdict: **READY FOR LIVE PAYMENT** / **NEEDS FIX** (with specific assertion that failed) / **BLOCKED** (e.g. no lead session, EuPago 4xx).

## What I will not do

- Complete payment at `clientes.eupago.pt`.
- POST to `/api/public/eupago-webhook` to fake a paid status.
- Insert/update any rows by hand.
- Touch product code, prices, webhook, or schema.

Approve and switch to build mode and I'll execute Test A first, report, then Test B.
