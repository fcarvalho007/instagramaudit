## 1. Current state (diagnosis)

### 1.1 Account creation flow (onboarding modal)
- Endpoints
  - `POST /api/onboarding/check-email` → `findLead(email_normalized)`. Returns `{ exists, verification_mode }`. In `mode=off` (current beta) it **already issues the `lead_session` cookie and grants initial credits if the email exists** — no proof of ownership.
  - `POST /api/onboarding/start` → upserts `leads` row, then branches by `EMAIL_VERIFICATION_MODE`:
    - `off` → `grantInitialCredits` + `setLeadCookie` immediately, returns `lead_id`, `credits`, `verification_required:false`. **No email is sent.**
    - `magic_link` → fire-and-forget `sendVerificationEmail` (Brevo→Resend, signed token, route `/api/public/verify-email`). Cookie + credits only after click.
    - `otp` → legacy `supabase.auth.signInWithOtp`.
  - `POST /api/onboarding/claim-existing` → re-verifies a Supabase access_token, lazy-creates lead, sets `lead_session` cookie.
- `lead_session` is created server-side only (`setLeadCookie`, HMAC-signed, `HttpOnly; Secure; SameSite=None`, 1y Max-Age, hard 90d TTL).
- Initial credits are granted at the same moment as the cookie (so always paired with verified ownership when mode≠off).

### 1.2 Login flow
- `/login` calls `autoLogin()` server fn that **generates a random temp password, resets the hardcoded test user, and returns the password to the client** for `signInWithPassword`. Single-user beta hack — must not survive past testing.
- `/signup` exposes a real `signUp(email, password)` form (user-defined password). Works, but is disconnected from the onboarding modal flow.
- `/reset-password` exists for Supabase recovery.
- Magic link: not wired into `/login`. Only used inside the onboarding modal when `EMAIL_VERIFICATION_MODE=magic_link`.
- Default mode today: `off` → frictionless beta, no email verification, no password.

### 1.3 Email sending
- `sendTransactionalEmail` (`src/lib/email/transactional-email.server.ts`) is the single helper: Brevo first (`BREVO_API_KEY`, `BREVO_FROM_EMAIL`), Resend fallback (`RESEND_API_KEY`, `RESEND_FROM`). Logs provider events.
- Templates registered: `personal-area-saved`, `report-ready`, `feedback-request`, `request-received`, `commercial-followup`, `welcome-beta`, `report-summary`, `payment-confirmed`, `report-saved`, `email-verification`.
- A "report ready / access" email can be sent today via the existing `report-saved` template (already used by the lead-magnet sequence) or `report-ready`. No new template strictly required for v1.

### 1.4 Security audit
- ✅ `lead_session` set only server-side, HMAC-signed, HttpOnly, Secure, SameSite=None, hard 90d TTL.
- ✅ Disposable email domains rejected (`classifyEmailDomain` in `/start`).
- ✅ Honeypot + 2s timing trap on `/start`.
- ✅ `check-email` has constant-time 200ms floor (anti-enumeration timing).
- ⚠️ **Enumeration via response shape**: `check-email` still returns `exists: true|false`. Mitigated by timing floor but still discloses membership.
- ⚠️ **`mode=off` lets anyone with a known email take over the lead**: `check-email` issues cookie + credits without any proof. Acceptable only because beta is private/admin and there are essentially no real returning users yet — but must change before opening the funnel.
- ⚠️ `autoLogin` returns a server-generated password to the browser. Acceptable as test-only; must be removed/feature-flagged before any external use.
- ✅ `claim-existing` re-verifies the Supabase JWT server-side; never trusts client-supplied email.
- ✅ No plaintext passwords are stored by us or emailed today. The temp password from `autoLogin` is generated per call and only used immediately for `signInWithPassword`; still, returning a password over the wire is a smell.

## 2. Recommended product decision

Keep beta frictionless **for new visitors**, but never grant a session to a returning email without proof of ownership.

- Drop `autoLogin` from production paths (keep behind `ADMIN_ONLY` flag or delete).
- Do not introduce server-generated passwords anywhere user-facing.
- Two supported auth factors going forward:
  1. **Magic link** (default, frictionless, works for both signup and login).
  2. **Password** — only set by the user themselves, via `/signup` (new account) or `/reset-password` (after magic-link login). Never auto-generated, never emailed.
- OTP code path stays available as a fallback `EMAIL_VERIFICATION_MODE` for future stricter mode.

## 3. Target UX — email-first flow

```text
                ┌────────────────────────────┐
                │  Step 1: Email             │
                │  (single input + CTA)      │
                └──────────────┬─────────────┘
                               │ POST /api/onboarding/check-email
                               ▼
              ┌────────────────┴────────────────┐
              │                                 │
        exists:false                       exists:true
              │                                 │
              ▼                                 ▼
   ┌──────────────────────┐         ┌──────────────────────────┐
   │ Step 2: Qualification│         │ Step 2: Welcome back     │
   │ (existing 2 cards)   │         │ Choice:                  │
   ├──────────────────────┤         │  (a) Send magic link  ◄──┐
   │ Step 3: Account form │         │  (b) Use password        │
   │ name + GDPR (+ pwd?) │         └────────┬─────────────────┘
   │                      │                  │
   │ POST /onboarding/    │       ┌──────────┴───────────┐
   │ start                │       │                      │
   └──────────┬───────────┘       ▼                      ▼
              │             magic link sent       /login w/ pwd
              │             "check your inbox"    signInWithPassword
              │             click → /verify-email          │
              │             → cookie + credits             │
              ▼                    │                       │
       Report opens immediately    └─── Report opens ──────┘
              │
              ▼
   Transactional email: "Relatório pronto + acesso à tua área"
   (Brevo → Resend, template = report-saved/report-ready,
    contains report URL + magic link to private area)
```

Notes:
- For **new email** the report still opens immediately on success (current beta behaviour preserved). The email afterwards gives them a re-entry path without needing a password.
- For **existing email** the report only opens after the user proves ownership (magic link click or password). This is the key security fix.
- Password is **optional** and only collected when the user explicitly opts in ("Quero também definir uma palavra-passe"). Default path = passwordless.
- The "report ready + account access" email always carries: (a) deep link to the report (existing snapshot URL), (b) a magic link to `/conta` valid for N days (re-uses `signVerificationToken`).
- Disposable email rejection + honeypot + timing trap remain unchanged.

## 4. Minimal safe implementation plan (when build mode is approved)

Phased so each step is independently shippable and reversible.

### Phase A — Stop the bleeding (security, no UX change)
- `check-email` (`mode=off` branch): stop auto-issuing `lead_session`/credits for existing emails. Return only `{ ok, exists, verification_mode }`. UI shows "welcome back" choice.
- Delete or gate `autoLogin` + `/login` temp-password path behind `BETA_AUTOLOGIN=1` env (off by default in production).

### Phase B — Email-first modal
- Refactor `EntryStepBody` so Step 1 is just the email field + GDPR. Submission calls `check-email`.
- New `ReturningStepBody` (existing email): two CTAs — "Receber link de acesso" (calls a new `POST /api/auth/request-magic-link`, returns 200 always; constant-time) and "Entrar com palavra-passe" (mounts a small password form → `signInWithPassword`; on success calls `claim-existing` with the token).
- Keep `QualificationStepBody` + `FinalStepBody` only on the new-email path. Add optional "Definir palavra-passe agora" toggle that posts to `supabase.auth.admin.createUser` via a new server fn (user-supplied password, never generated).

### Phase C — Contextual report email
- After `/api/onboarding/start` success (new email, mode=off), enqueue a `report-saved`/`report-ready` send that includes:
  - the report URL,
  - a magic link to `/conta` built with `signVerificationToken({ leadId, email, scope: "account-access" })`,
  - friendly PT-PT copy explaining InstaBench, beta status, and that the link is just for re-entry.
- New template variant in `src/lib/email/templates/` (or props extension on `report-saved`) — no new infra needed; Brevo→Resend already wired.

### Phase D — Reactivable strict verification
- Keep `EMAIL_VERIFICATION_MODE` env. Flipping to `magic_link` re-enables the existing verification-gated path (already implemented), no code changes needed.
- Document the env switch in `LOCKED_FILES.md` / admin runbook.

## 5. Affected files (read-only inventory; no edits yet)
- `src/components/onboarding/onboarding-modal.tsx` (split entry step, add returning step + optional password field)
- `src/routes/api/onboarding/check-email.ts` (drop mode=off auto-claim; constant-time response stays)
- `src/routes/api/onboarding/start.ts` (trigger post-success "report ready + access" email, accept optional user-set password)
- `src/routes/api/onboarding/claim-existing.ts` (reuse for password-login + magic-link claim)
- New `src/routes/api/auth/request-magic-link.ts` (constant-time wrapper around `sendVerificationEmail`)
- New `src/lib/email/send-report-access.server.ts` (or extend `send-report-saved.server.ts` with `accountAccessUrl`)
- New `src/lib/email/templates/report-access.ts` (or update `report-saved.ts`)
- `src/lib/email/verification-token.server.ts` (add optional `scope` claim)
- `src/routes/login.tsx` + `src/lib/rpc/auto-login.functions.ts` (gate or delete; replace `/login` with magic-link + password form)
- `src/routes/api/public/verify-email.ts` (support `scope=account-access` to redirect to `/conta` instead of report)
- `LOCKED_FILES.md` (note the `EMAIL_VERIFICATION_MODE` switch)

## 6. Risks & edge cases
- **Returning lead in current beta** — closing the mode=off auto-claim is a behaviour change; some testers may need to click a magic link the next time. Acceptable, and the new UX explains it.
- **Email deliverability** — the post-report email is critical. Brevo is primary; Resend fallback is wired but only fires on Brevo failure. Need to verify `BREVO_FROM_EMAIL` and `RESEND_FROM` are set in prod env before rollout.
- **Token reuse / scope confusion** — adding a `scope` claim to `signVerificationToken` requires versioning the signature payload; old tokens still in flight must keep working until TTL expiry, or accept a one-time invalidation window.
- **Password optional UX** — must make clear that skipping the password is fine and they can always log in via magic link.
- **Enumeration** — even with constant-time, returning a different next-step UI for existing vs new emails is a side channel. Mitigation: same "verifica o teu email" copy for both new and returning paths when the user picks magic link; only the password path is visibly different.
- **`autoLogin` removal** — confirm no Playwright/admin test depends on it before deleting.
- **Disposable domain list** — already in place; revisit list after rollout.
- **GDPR consent** — must still be captured on the new-email path before any send.
