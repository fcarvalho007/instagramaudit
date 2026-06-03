## Goal

Resolve the `EuPago checkout failed (404): null` blocker by fixing the Pay By Link endpoint path. No other changes to UI, pricing, schemas, webhooks, entitlements or providers.

## Root cause

`src/lib/payments/eupago.server.ts` calls:

```
${EUPAGO_BASE_URL}/clientes/rest_api/paybylink/create
```

EuPago's current REST API is versioned under `/api/v1.02/`. With `EUPAGO_BASE_URL=https://clientes.eupago.pt`, the working Pay By Link path is `/api/v1.02/paybylink/create`. The `/clientes/rest_api/...` shape is from a deprecated/different contract and returns 404 on the current account.

Auth header (`Authorization: ApiKey <key>`) and JSON payload shape are consistent with the v1.02 contract and stay.

## Changes

### 1. `src/lib/payments/eupago.server.ts`

- Treat `EUPAGO_BASE_URL` as host-only (e.g. `https://clientes.eupago.pt`), strip trailing slashes (already done).
- Introduce a new optional env var **`EUPAGO_PAYBYLINK_PATH`**, default **`/api/v1.02/paybylink/create`**. Normalize so it always starts with `/` and has no trailing slash.
- Build the request URL as `${baseUrl}${path}`.
- Improve error handling on non-2xx / non-JSON responses:
  - Read response as text first (fallback when body is empty/non-JSON, which is why the current 404 logs `null`).
  - Throw an `Error` whose message contains: HTTP status, the **path only** (not full URL with query), and a sanitized snippet of the response body (max ~500 chars, with any `apiKey`/`Authorization`/`ApiKey ...` substrings redacted).
  - Never include the API key in the thrown message or in `console.error`.
- Add a single `console.error("[eupago] checkout failed", { status, path, bodySnippet })` before throwing, so server logs capture it without leaking secrets.
- No change to payload shape, no change to response parsing for the success path, no change to `verifyWebhookSignature`.

### 2. `.env` / secrets

- `EUPAGO_BASE_URL` stays. Document it must be host-only: `https://clientes.eupago.pt` (or `https://sandbox.eupago.pt` for sandbox).
- `EUPAGO_PAYBYLINK_PATH` is **optional**. Only set it if EuPago ever changes the versioned path again; default value is correct for v1.02.
- No new secret added. `EUPAGO_API_KEY` and `EUPAGO_WEBHOOK_SECRET` are unchanged.

### 3. Tests — `src/lib/payments/__tests__/eupago-checkout.test.ts` (new)

Mock `globalThis.fetch` (vitest `vi.spyOn`) so no network is touched.

- **URL composition**: with `EUPAGO_BASE_URL=https://clientes.eupago.pt` and no `EUPAGO_PAYBYLINK_PATH`, the helper calls `https://clientes.eupago.pt/api/v1.02/paybylink/create`.
- **Path override**: setting `EUPAGO_PAYBYLINK_PATH=/api/v9/paybylink/create` is respected; trailing slash on base or leading slash missing in path is normalized.
- **Auth header**: request includes `Authorization: ApiKey <key>` and `Content-Type: application/json`.
- **404 safe error**: when fetch resolves with `{ ok:false, status:404, text: async () => "<html>Not Found</html>" }`, the call rejects with an Error whose message includes `404` and `/api/v1.02/paybylink/create`, but does **not** include the API key.
- **Empty body 404**: when response body is empty, the message still includes the status and path (no `null` swallowing).
- **No payment side-effects**: this is a pure unit test on `createEupagoCheckout` — assert it throws and that no DB / Supabase module is imported (the helper has no DB access by design; the test reinforces this by spying on `supabaseAdmin` not being touched — covered indirectly by the helper being pure HTTP).

Existing `eupago-signature.test.ts` stays unchanged.

### 4. Validation

- `bunx tsc --noEmit`
- `bunx vitest run src/lib/payments/__tests__/eupago-checkout.test.ts src/lib/payments/__tests__/eupago-signature.test.ts`

## Files changed

- `src/lib/payments/eupago.server.ts` — endpoint path config + safer error message
- `src/lib/payments/__tests__/eupago-checkout.test.ts` — new test file

## Smoke test retriability

After this fix, the focused checkout smoke test on `/checkout/authority-diagnosis` can be retried. If EuPago still returns 404 with the corrected `/api/v1.02/paybylink/create` path, the new error message will show the exact path + status + sanitized body, which pinpoints whether the remaining issue is auth-key scope, channel id, or base host (sandbox vs production) — without code changes.

## Out of scope (explicitly not touched)

Checkout UI, pricing, product codes/amounts, `lead_payments` schema, `lead_entitlements`, webhook logic, onboarding, report logic, Apify/OpenAI/DataForSEO, admin, homepage, the pre-existing `checkout_*` tracking enum issue (separate task).
