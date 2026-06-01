## Root cause (confirmed)

`POST /api/onboarding/start` returns 500 `INTERNAL_ERROR` ("Falha interna ao iniciar sessão.") because `setLeadCookie()` throws:

```
[onboarding/start] cookie write failed
Error: SESSION_SECRET missing or too short (need at least 16 chars).
  at POST src/routes/api/onboarding/start.ts:208
```

- `SESSION_SECRET` is configured in Lovable Cloud secrets, but the current value is **15 chars long** (verified via runtime check).
- `src/lib/leads/lead-cookie.server.ts:28` enforces `secret.length < 16` → throws → handler returns the generic 500.
- Upstream steps (Zod parse, `leads` upsert, `grantInitialCredits`, `getBalance`) all succeed — the lead is created and credits are granted, only the cookie write fails, so the user can't proceed.

Nothing else is broken: payload contract matches the Zod schema, `credit_ledger` / `credit_balance` exist, phone is optional in the backend and accepted, no migration needed.

## Fix

### 1. Rotate `SESSION_SECRET` to ≥32 chars (required, blocks everything)

In build mode I'll call `update_secret` for `SESSION_SECRET`. You'll paste a new value (recommend 48+ random chars, e.g. `openssl rand -base64 48`). This is the only environment change needed. Rotating invalidates any existing `lead_session` cookies (acceptable — flow is still pre-launch).

### 2. Harden `/api/onboarding/start` error handling

Currently any cookie-write failure returns the same generic message. After the secret is fixed, surface a clearer fallback and log distinct error codes so we don't repeat this diagnostic blind:

- Replace the generic "Falha interna ao iniciar sessão." with:
  - PT: "Não foi possível preparar o acesso ao relatório. Tenta novamente dentro de instantes."
  - EN equivalent in `gate.json` (`onboarding.errors.generic`).
- Add a startup-time guard: if `SESSION_SECRET` length < 16, log a single clear warning on the first request (`[onboarding/start] SESSION_SECRET misconfigured`) so future regressions are obvious in logs.
- Keep behaviour identical otherwise — no changes to credit logic, payload shape, modal sequence, or downstream `/analyze/$username`.

### 3. Copy update

Update `src/i18n/locales/{pt,en}/gate.json` `onboarding.errors.generic` to the new copy above. No other strings change.

### 4. Tests

Extend `src/lib/leads/__tests__/lead-cookie.test.ts` (already exists) to assert:
- `encodeLeadCookie` throws clearly when `SESSION_SECRET` is missing/<16.
- Round-trip encode/decode works with a 32-char secret.

Add a focused server-route test for `/api/onboarding/start`:
- Valid payload with valid secret → 200, `lead_id`, `credits >= 2`, `Set-Cookie: lead_session=...`.
- Valid payload with short secret → 500 with the new copy (no PII leak).
- Invalid payload → 400 `INVALID_PAYLOAD` (not generic 500).
- Duplicate email → 200, credits not duplicated (idempotent grant).

### 5. Validation

- `bunx tsc --noEmit`
- `bunx vitest run src/lib/leads src/routes/api/__tests__` (scoped)
- Manual smoke: handle → modal → step 5 submit → 200 → cookie present → navigate to `/analyze/$username`.

## Out of scope (unchanged)

`analyze-public-v1`, credit grant/reserve logic, Apify/OpenAI/DataForSEO, pricing, premium gating, thumbnails, the report selector, modal layout/sequence, `/report.example`.

## Files touched

- (secret) `SESSION_SECRET` rotated via `update_secret`
- `src/routes/api/onboarding/start.ts` — clearer logging + (optional) startup guard
- `src/i18n/locales/pt/gate.json`, `src/i18n/locales/en/gate.json` — error copy
- `src/lib/leads/__tests__/lead-cookie.test.ts` — extended assertions
- `src/routes/api/__tests__/onboarding-start.test.ts` — new

## Checkpoint

☐ Rotate `SESSION_SECRET` (≥32 chars)
☐ Update error copy PT/EN
☐ Add logging guard in onboarding/start
☐ Extend lead-cookie tests + add onboarding-start tests
☐ `bunx tsc --noEmit` clean
☐ Vitest scoped run green
☐ Manual smoke: step 5 submit returns 200 and `lead_session` cookie is set
