## Root cause

`createEupagoCheckout` already resolves `lead_id` server-side from the signed `lead_session` cookie, not from the frontend. The failure happens because the cookie is only HMAC-validated; the code does not verify that the decoded lead still exists in `leads` before inserting into `lead_payments`.

So a stale/deleted lead session can pass the checkout UI gate, then `lead_payments.lead_id` hits the database foreign key and the raw error is thrown to the user.

## Current payment path findings

- `/checkout/report-full` and `/checkout/authority-diagnosis` both call the same `createEupagoCheckout` server function.
- `lead_id` is currently sourced in `src/lib/payments/eupago.functions.ts` via `getLeadFromCookie()`.
- The frontend does not currently send `lead_id` from either checkout route.
- `getLeadSessionStatus` only checks whether the cookie signature is valid; it does not check the `leads` row exists.
- `lead_payments` insert currently happens before the lead email lookup, so missing lead rows surface as FK errors.
- Raw insert errors are currently thrown as `Failed to create payment row: ...`, which can expose table/constraint names.

## Implementation plan

### 1. Extract the payment orchestration into a testable server helper

Create a server-only helper for the internal checkout creation flow, then keep `createEupagoCheckout` as the TanStack server function wrapper.

Proposed shape:

```text
src/lib/payments/eupago.functions.ts
  - validates RPC input
  - dynamically imports server-only helper
  - calls helper

src/lib/payments/eupago-checkout.server.ts
  - reads lead_session server-side
  - validates lead exists
  - resolves server-side product amount
  - inserts lead_payments
  - calls EuPago provider client
  - updates provider checkout fields
  - records product events
```

This keeps the client-importable `.functions.ts` safe and makes the critical logic unit-testable without fighting TanStack RPC internals.

### 2. Resolve and validate lead server-side before insert

Payment creation will:

1. Read `lead_session` from the current server request using the existing cookie helper.
2. If missing/invalid: stop before any insert/provider call.
3. Query `leads` by the decoded lead id.
4. If no row exists: stop before any insert/provider call.
5. Use the verified `lead.id` for `lead_payments.lead_id`.
6. Use `lead.email` only as optional EuPago customer email.

Expected outcomes:

- Valid cookie + existing lead: `lead_payments` insert succeeds with that lead id.
- Missing cookie: safe checkout error, no insert.
- Invalid/stale cookie: safe checkout error, no insert.
- FK violation is no longer the normal control path and is never shown raw.

### 3. Ignore frontend-supplied `lead_id`

Add a compatibility-only optional `lead_id` field to the payment input schema, but never use it. The server will always use the cookie-resolved lead.

This supports a focused test proving that even if a malicious/old frontend sends `lead_id`, the inserted payment row uses the server-resolved cookie lead.

### 4. Replace raw DB errors with safe user-facing copy

Any lead-resolution or payment-row preparation failure will throw the safe message:

PT:

```text
Não foi possível preparar o pagamento. Volta ao relatório e tenta novamente.
```

EN copy will be kept alongside it for future locale-aware UI use:

```text
We could not prepare the payment. Please return to the report and try again.
```

Internal errors can still be logged server-side, but client-visible errors must not include:

- `lead_payments_lead_id_fkey`
- table names
- SQL/Postgres messages
- internal lead/payment ids

### 5. Tighten the checkout session gate

Update `getLeadSessionStatus` so it checks both:

- cookie is valid
- decoded lead id exists in `leads`

This means stale cookies should show the existing missing-session checkout fallback before the user reaches the final payment step. The payment server function will still repeat the check as the source of truth.

### 6. Preserve both checkout routes and product config

No visual checkout changes.

- `/checkout/report-full` keeps sending `product_code: report_full_9`.
- `/checkout/authority-diagnosis` keeps sending `product_code: authority_diagnosis_97`.
- Product prices remain server-side in `products.server.ts`:
  - `report_full_9` = `900` cents EUR
  - `authority_diagnosis_97` = `9700` cents EUR
- EuPago endpoint/path and webhook logic remain unchanged.

### 7. Admin linkage confirmation

The fixed insert will continue to include:

- `lead_id`
- `product`
- `amount_cents`
- `currency`
- `provider = eupago`
- `status`
- `provider_checkout_url` after EuPago responds
- `instagram_username`
- `report_cache_key`
- `metadata.source_component`
- `metadata.billing`

Current `/admin` already reads `lead_payments` by `lead_id` in these areas:

- `/api/admin/leads-kanban` payment summary
- `/api/admin/leads-funnel` checkout and paid conversion
- `/api/admin/pre-revenue-signals` revenue signals
- `/api/admin/overview-kpis` revenue metrics

Admin gaps to report, not build in this task:

- No dedicated payment-attempts table/list in the UI showing every pending/failed payment row.
- Existing admin payment product labels still include legacy `report_single` / `pack_5` assumptions; the new rows are stored and aggregated, but exact product-label UI may need a follow-up pass.

### 8. Tests to add/update

Add focused tests around the new server helper:

- Valid `lead_session` inserts a pending `lead_payments` row.
- Missing `lead_session` does not insert and does not call EuPago.
- Stale/invalid `lead_session` where lead does not exist does not insert.
- Frontend-supplied `lead_id` is ignored; cookie lead id is inserted.
- DB FK/raw insert error is not exposed to the returned error message.
- `report_full_9` uses `amount_cents = 900` server-side.
- `authority_diagnosis_97` still uses `9700` and remains unaffected.

Keep existing provider-client tests for EuPago endpoint behavior unchanged.

## Files likely to change

- `src/lib/payments/eupago.functions.ts`
- `src/lib/payments/eupago-checkout.server.ts` new server-only helper
- `src/lib/leads/lead-session.functions.ts`
- `src/lib/payments/__tests__/eupago-checkout-flow.test.ts` new focused tests

Possibly changed only if useful for shared copy/constants:

- `src/lib/payments/checkout-errors.ts`

## Validation after implementation

Run:

```text
bunx tsc --noEmit
bunx vitest run src/lib/payments/__tests__/eupago-checkout-flow.test.ts src/lib/payments/__tests__/products.test.ts src/lib/payments/__tests__/eupago-checkout.test.ts
```

## Risks

- If old cookies point to deleted leads, users will need to return to the report/free flow to create a fresh lead session.
- The current checkout UI is Portuguese-only, so the immediate visible error will be PT; EN copy can be wired when/if checkout localization is introduced.
- Admin can aggregate linked payment rows today, but a dedicated payment-attempts view is still a follow-up if full operational visibility is required.

## Ready for smoke test criteria

After implementation, `/checkout/report-full` is ready for smoke test when:

- final step creates exactly one pending `lead_payments` row for an existing lead
- no FK error reaches the user
- provider checkout URL is stored when EuPago succeeds
- invalid/missing/stale sessions create no payment rows
- no provider enrichment calls are triggered