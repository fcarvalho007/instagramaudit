
# Plan — `lead_session` diagnostic endpoint

Goal: ship a single, safe, admin-gated HTTP endpoint that tells us, for any browser session, **why** `lead_session` is or isn't being honored on `auditprofiles.com` — without leaking secrets or PII. No changes to onboarding, checkout, payments, EuPago, schema, pricing, or report code.

## Recommended approach: Option A only

A single server route. No admin UI yet — once the endpoint exists, manual QA from the user's real browser is enough to discriminate every failure mode. An `/admin/sistema` card can come later if we end up using it repeatedly.

## Endpoint

- **Path:** `GET /api/debug/lead-session-status`
- **Why not `/api/public/...`:** `/api/public/*` bypasses Lovable's published-site auth; we want the opposite. Keeping it outside `public/` plus an explicit admin check keeps it locked.
- **Auth:** Requires admin. Reuse `requireAdminSession()` from `src/lib/admin/session.ts`, which validates the `X-Admin-Email` header against `ADMIN_ALLOWED_EMAILS`. Returns `401` / `403` otherwise.
  - Trade-off: the user's onboarding browser tab won't have the `X-Admin-Email` header set. For diagnosis we call the endpoint from a separate admin-authenticated context, OR temporarily allow a query token (see below).
- **Optional second gate (for the real test):** to diagnose the actual onboarding browser session we need the endpoint to read *that browser's* cookie. Two clean options, pick one — I recommend the first:
  1. **`X-Admin-Email` + run from the same browser after logging into `/admin`.** Same browser session, same cookie jar — the `lead_session` cookie is sent on the request because it's same-origin on `auditprofiles.com`. Zero new auth surface.
  2. **Short-lived `?token=` query gate** using a new `DEBUG_LEAD_SESSION_TOKEN` env secret. Useful only if we can't easily log into `/admin` in the test browser. Higher risk — skip unless needed.

## Response shape (safe-only)

```json
{
  "timestamp": "2026-06-05T12:34:56.789Z",
  "request_host": "auditprofiles.com",
  "request_protocol": "https",
  "has_cookie_header": true,
  "cookie_names_present": ["lead_session", "..."],
  "has_lead_session_cookie": true,
  "cookie_value_shape": "looks_valid_shape",
  "cookie_segment_count": 3,
  "decoded_cookie_valid": true,
  "lead_id_present": true,
  "lead_id_prefix": "021a9e49",
  "lead_exists": true,
  "issued_at_sec": 1733400000,
  "session_secret_configured": true,
  "cookie_attrs_expected": "Max-Age=31536000; Path=/; HttpOnly; Secure; SameSite=None; Partitioned"
}
```

Field rules:

- `cookie_value_shape`: `"missing" | "malformed" | "looks_valid_shape"` — derived purely from segment count + UUID regex on segment 0. Never the actual value.
- `cookie_names_present`: names only, never values. Helps spot rogue cookies / domain mismatch.
- `lead_id_prefix`: first 8 chars of the UUID only, and only when `decoded_cookie_valid` is true. Lets us correlate with DB rows without exposing the full id.
- `request_host` / `request_protocol`: from `getRequestHost()` + request URL. Critical to detect host mismatch (apex vs www vs preview vs lovable.app).
- `session_secret_configured`: boolean from `Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32)`. Never echo the secret.
- `cookie_attrs_expected`: static string describing what `setLeadCookie` writes — for human comparison against DevTools.

Never returned: raw cookie value, signature, full lead id, email, name, phone, IP, user-agent, `SESSION_SECRET`.

## Diagnostic decision table

| Symptom from endpoint                                                              | Conclusion             |
| ---------------------------------------------------------------------------------- | ---------------------- |
| `has_cookie_header: false`                                                         | Browser sent no cookies at all → likely third-party context / privacy mode |
| `has_cookie_header: true`, `has_lead_session_cookie: false`                        | COOKIE_NOT_SENT (host mismatch or CHIPS partition) |
| `has_lead_session_cookie: true`, `cookie_value_shape: "malformed"`                 | COOKIE_INVALID (truncation / wrong cookie reused) |
| `has_lead_session_cookie: true`, `decoded_cookie_valid: false`                     | SECRET_MISMATCH or tamper |
| `decoded_cookie_valid: true`, `lead_exists: false`                                 | Lead row missing (DB wipe / wrong env) |
| All true                                                                           | Cookie path is healthy — bug is elsewhere |

Combined with the `request_host` value, we can directly attribute COOKIE_NOT_SET vs HOST_MISMATCH.

## Security precautions

- Admin auth required on every request (`requireAdminSession()` throws 401/403).
- No PII, no secrets, no raw cookie, no signature in response.
- Truncate lead id to first 8 chars.
- No write operations; pure read.
- No logging of full cookie or headers server-side.
- Not under `/api/public/*` — so Lovable's published-site auth still applies on top.
- `cache-control: no-store` on the response.

## Files to change

- **New:** `src/routes/api/debug/lead-session-status.ts` — the server route.
- **No edits to:**
  - `src/lib/leads/lead-cookie.server.ts` (reuse `LEAD_COOKIE_NAME`, `decodeLeadCookie`, `readLeadIdFromRequest`)
  - `src/lib/admin/session.ts` (reuse `requireAdminSession`)
  - `src/integrations/supabase/client.server.ts` (reuse `supabaseAdmin` for `leads` lookup)
  - any onboarding / checkout / payment / EuPago / report / pricing file
- **No DB migration, no schema change, no new secret** (Option 1 above). Only if we accept Option 2 would we add `DEBUG_LEAD_SESSION_TOKEN`.

## Admin auth: yes, required

Hard requirement. Endpoint must be unusable by anonymous traffic even if URL leaks. `requireAdminSession()` is the existing, audited gate.

## Test plan

End-to-end manual QA on production, from the actual failing browser:

1. In Browser A (admin), open `https://auditprofiles.com/admin`, log in with allow-listed email. Confirms `X-Admin-Email` plumbing is alive (the `adminFetch` helper sets it from localStorage; we'll call the debug endpoint via `adminFetch` from DevTools console, e.g. `await (await fetch('/api/debug/lead-session-status', { headers: { 'X-Admin-Email': localStorage.getItem('admin-email') }})).json()`).
2. **Baseline (no onboarding yet):**
   - Open a fresh incognito Browser B on `https://auditprofiles.com`.
   - From DevTools, hit the endpoint with the admin email header. Expect: `has_lead_session_cookie: false`, `request_host: "auditprofiles.com"`.
3. **After onboarding:**
   - In Browser B, complete onboarding to the point where `/api/onboarding/start` succeeds.
   - In DevTools → Application → Cookies, screenshot the `lead_session` row (Domain, Path, SameSite, Partitioned, Secure).
   - Hit endpoint again. Expect: `has_lead_session_cookie: true`, `decoded_cookie_valid: true`, `lead_exists: true`, `lead_id_prefix` matches DB.
4. **Navigate to checkout:**
   - In Browser B, navigate to `/checkout/report-full?username=...`.
   - If `MissingLeadSession` shows, immediately open DevTools console on that same page and hit the endpoint. Compare `request_host` with onboarding host. Compare `has_lead_session_cookie` true vs false. This single comparison nails COOKIE_NOT_SENT vs HOST_MISMATCH vs CHIPS-partition.
5. **Cross-host check:**
   - Repeat from `https://www.auditprofiles.com/` and from `https://instagramaudit.lovable.app/` to see whether the cookie is created on a different host than the one used for checkout.

Unit test (optional, low cost): one Vitest file under `src/routes/api/debug/__tests__/lead-session-status.test.ts` asserting that without `X-Admin-Email` the route returns 401, and with a valid admin + crafted cookie header returns the expected shape (no raw value present).

## Out of scope (explicit non-goals)

- Changing cookie attributes (Domain, SameSite, Partitioned).
- Adding a redirect from `www` → apex or from preview hosts.
- Any change to `setLeadCookie`, onboarding, checkout, payments, EuPago, pricing, snapshots, schema.
- An admin UI card — defer until we know the endpoint is what we actually need long-term.

## No code changes yet

This is a plan only. On approval I will create exactly one new file (`src/routes/api/debug/lead-session-status.ts`) plus optionally one test file, and nothing else.
