
## Context

Most of the password-mode auth work landed in the previous turn (`AUTH_MODE=password`, server-side `admin.createUser` in `/api/onboarding/start`, `signInWithPassword` + `/claim-existing`, hardened autoLogin, `/login` and `/reset-password` routes). This plan completes the spec: UI polish for the password fields, copy alignment, a true single‑select qualification step, a security note + reset link in the post‑signup email, removal of the dead magic‑link UI from the public flow, and the missing tests.

## Scope

Edits only — no schema changes, no payment changes, no report changes.

## 1. Password UX polish (`src/components/onboarding/onboarding-modal.tsx`)

- Add **show/hide toggle** to both password fields (Eye/EyeOff button inside the input, `aria-pressed`, `aria-label`). Toggle is local state, never logged.
- Add a **strength hint** computed from `form.watch("password")`:
  - "Curta" (<8), "Aceitável" (≥8 + letter+number), "Forte" (≥12 + letter+number+symbol).
  - Inline tri-state bar + label, no value persisted.
- Tighten Zod in `src/lib/unlock-flow.ts`: require `≥8` AND `/[A-Za-z]/` AND `/\d/` when `password` is set (currently min 8 only). Keep the cross‑field "must match" rule.
- Verify draft hook (`useOnboardingDraft`) does NOT persist `password` / `confirm_password`. If it does, exclude them.

## 2. Single qualification step

Replace the current two-grid qualification step (profile_ownership + goal) with the spec's single select on the **final** form:

- Add `qualification` `<Select>` with the 6 options:
  `brand_company`, `marketing_comms`, `consultant_agency`, `content_creator`, `curiosity`, `other` (labels per spec, EU‑PT).
- Keep deriving `qualification` server‑side; drop the intermediate "qualification" step view (`{ kind: "qualification" }`) so the flow becomes `entry → final | login`.
- `buildStartPayload` already prefers `values.qualification`; remove the ownership/goal fallback path.
- `unlockFormSchema`: make `qualification` required when used by the modal (keep optional flag for legacy callers via a `.refine` in the form layer only).

## 3. Login panel copy

In `LoginPanel`:
- Title: **"Bem-vindo de volta"**
- Body: **"Este email já tem conta. Introduz a tua palavra-passe para continuar."**
- CTA: **"Entrar e continuar"**
- Link to `/reset-password?email=<prefilled>` labelled **"Esqueceste-te da palavra-passe?"**
- Email field pre-filled & read-only.

## 4. CTA + label copy

`src/i18n/locales/pt/gate.json`:
- `final.right.cta` → **"Criar conta e abrir relatório"**
- `final.right.ctaCheckout` → **"Criar conta e continuar"**
- `entry.eyebrowCheckout` → **"Antes de pagar"** (where appropriate)
- `creditNote` / `newPromise` / `bullets.credits` / OTP subtitle: drop "após confirmares o email" → **"2 créditos grátis incluídos na tua conta."**
- Remove "Gerar o meu relatório" strings used by the modal CTAs (keep only on the public homepage hero if unrelated to onboarding modal).

## 5. Remove dead magic-link / OTP UI from public flow

- Delete `MagicLinkSentPanel` and the `"Verifica o teu email…"` error fallback in `FinalStepBody` (handleFinalSubmit now treats `password_with_email_verification` as a real error returned by the server, not a public state).
- Remove unused i18n keys for OTP/magic-link panels (or keep keys but no UI reference).
- Magic-link backend paths remain reachable only when `AUTH_MODE=magic_link` (env override). No public UI exposes them.

## 6. Post‑signup email security note + reset link

`src/lib/email/templates/report-saved.ts` (used in welcome variant) and `welcome-beta.ts` if present:
- Append a fixed security block (welcome variant only):
  > "Por segurança, nunca enviamos a tua palavra-passe por email. Se te esqueceres dela, podes redefini-la aqui." + link to `${APP_URL}/reset-password`.
- Extend `ReportSavedInput` with optional `resetPasswordUrl`; sender (`send-report-saved.server.ts`) passes `${APP_URL}/reset-password`.
- Verify templates never reference any password field; add an assertion test.

## 7. Reset password flow

`src/routes/reset-password.tsx` already exists. Verify:
- Accepts `?email=` prefilled.
- Uses `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${origin}/reset-password })` for the "request" view, and `supabase.auth.updateUser({ password })` for the "set" view (recovery token in URL hash).
- Add the same password strength rules and show/hide toggle for parity.

## 8. autoLogin gate

Already gated by `BETA_AUTOLOGIN=1` + admin allowlist (previous turn). Add a single regression test that asserts a 403 without the flag.

## 9. Tests

New / updated under `src/routes/api/onboarding/__tests__/` and `src/components/onboarding/__tests__/`:

- `unlock-flow.test.ts`: password requires letter+number; confirm mismatch fails; password missing → invalid.
- `build-start-payload.test.ts`: password is forwarded; never logged; qualification taken from select.
- `onboarding-modal.test.tsx` (RTL):
  - existing email switches to LoginPanel (no signup form rendered);
  - existing email does not POST `/start`;
  - successful `signInWithPassword` triggers `/claim-existing` and sets `lead_session` via cookie;
  - wrong password leaves no `lead_session` call;
  - no MagicLink/OTP panel rendered in password mode;
  - localStorage draft does not contain `password`/`confirm_password`.
- `start.test.ts`: existing `auth.users` email → 409 `EMAIL_ALREADY_EXISTS`; no cookie set.
- `report-saved.test.ts`: HTML/text contain security note + reset link; do NOT contain `password` value or "palavra-passe:" plus a token; subject unchanged.
- `auto-login.test.ts`: returns 403 unless `BETA_AUTOLOGIN=1`.

## 10. Non-goals (explicit)

EuPago, webhooks, credit pack logic, `report_full_9`, 30d/90d, competitor, force refresh, cache, enrichments, report sections, admin analytics — untouched.

## Deliverable report (after build mode)

1. Files changed.
2. New signup flow (entry → final with qualification + password).
3. Existing user login flow (entry → login → claim-existing).
4. How `lead_session` is created (server‑side after `admin.createUser` or after `signInWithPassword` + claim).
5. Password protection (HIBP + min8+letter+number, never persisted client-side, never emailed).
6. Email template summary (welcome block + security note + reset link, no password value).
7. Tests run + results.
