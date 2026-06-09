## 1. Current flow (as built today)

```text
Entry modal ──► email
  ├─ new email     ──► Final step (name, email, phone, GDPR, marketing)
  │                    POST /api/onboarding/start
  │                      • upsert leads (phone, purpose, profile_ownership…)
  │                      • grantInitialCredits  → +2 credits NOW
  │                      • setLeadCookie (lead_session, HMAC)
  │                      • opens report immediately, no email verification
  │
  └─ existing email ──► OTP panel (Supabase signInWithOtp)
                         • verifyOtp → POST /api/onboarding/claim-existing
                         • links auth.user ↔ lead, setLeadCookie
                         • grantInitialCredits (idempotent — usually no-op)
```

Key facts:
- `leads` already has `user_type`, `purpose`, `profile_ownership`, `phone`, `phone_normalized`, `gdpr_consent_at`, `marketing_consent`.
- `credit_ledger` has partial unique index `uniq_credit_ledger_initial_grant` (one `initial_grant` row per lead) → idempotency is already guaranteed at DB level.
- Supabase Auth email OTP is already wired (`signInWithOtp` + `verifyOtp`, 6-digit code). Magic-link infra not used.
- `start.ts` has a defense-in-depth guard that returns `EMAIL_REQUIRES_VERIFICATION` when the email already maps to a lead → existing-user path can't be bypassed.

## 2. Proposed flow

```text
Entry modal ──► email
  ├─ NEW email
  │     Final step (name, email, qualification, GDPR, marketing — no phone)
  │     POST /api/onboarding/start
  │        • upsert leads (qualification, email_domain_class) — NO credit grant
  │        • setLeadCookie (report can open immediately, no credits yet)
  │        • signInWithOtp(shouldCreateUser=true) → email sent
  │        • report opens; UI shows "Confirma o teu email para activar 2 créditos"
  │     verifyOtp → POST /api/onboarding/claim-new
  │        • link auth.user ↔ lead, grantInitialCredits (+2, idempotent)
  │
  └─ EXISTING email (unchanged)
        OTP panel → verifyOtp → /api/onboarding/claim-existing
        Copy update: "Esta conta já existe. Enviámos um link para confirmares o acesso."
```

Net result: free credits are gated on a verified email; report viewing is not, so abandonment isn't punitive.

## 3. Affected surface

Frontend
- `src/components/onboarding/onboarding-modal.tsx`
  - Remove phone field; add `qualification` Select; update entry copy ("…2 créditos grátis após confirmares o email"); after `/start` success, route to OTP panel instead of closing.
- `src/components/onboarding/otp-verify-panel.tsx` (existing) — reuse for both new + existing paths; copy variant ("nova conta" vs "voltar a entrar").
- `src/i18n/locales/{pt,en}/gate.json` — new keys (`final.right.qualificationLabel`, options, `final.left.bullets.report/save/credits`, OTP "new account" copy, post-verify toast).
- `src/lib/leads/use-onboarding-draft.ts` and `build-start-payload.ts` — drop phone, add `qualification`, remove `purpose`/`profile_ownership` from required path.
- Optional: tiny "Confirma o teu email para activar os teus 2 créditos" banner in the report shell when `lead_session` exists but no `initial_grant` row.

Backend (server fns / routes)
- `src/routes/api/onboarding/start.ts` — drop phone from schema; require `qualification`; **remove** `grantInitialCredits` call; trigger Supabase OTP send; persist `email_domain_class`.
- `src/routes/api/onboarding/claim-new.ts` — new route; same shape as `claim-existing.ts`, but for first-time verification: links auth user ↔ lead **and** calls `grantInitialCredits`.
- `src/routes/api/onboarding/claim-existing.ts` — keep; verify it still works without phone in payload (it doesn't read phone).
- `src/lib/credits/credits.server.ts` — record `metadata.kind = 'signup_verified'` on the initial grant for analytics. No new code path; the existing `grantInitialCredits` already provides exact-once semantics.
- `src/lib/leads/email-domain-class.ts` — new tiny helper: maps `gmail.com|hotmail.com|outlook.com|yahoo.*|icloud.com|live.com|aol.com|proton(me|mail).com` → `consumer_domain`; a short hard-coded disposable list (`mailinator.com, tempmail*, 10minutemail, guerrillamail, yopmail, trashmail, sharklasers, dispostable`) → `disposable_or_suspicious`; everything else → `professional_domain`. Disposable → reject with `INVALID_PAYLOAD { field: email, code: disposable }`. Consumer/professional → accepted, just labeled.

Database
- One migration:
  - `ALTER TABLE public.leads ADD COLUMN qualification TEXT, ADD COLUMN email_domain_class TEXT;`
  - `CHECK (email_domain_class IN ('professional_domain','consumer_domain','disposable_or_suspicious'))` (nullable for legacy rows).
  - Reuses the existing partial unique index on `credit_ledger` — no schema change needed for idempotency.
- Admin: list view shows `qualification` and `email_domain_class` (column add only; admin filter follow-up).

Untouched (per the constraints): checkout, EuPago, credit consumption rules, 30d/90d, competitor logic, report sections, Free↔Pro gating, enrichments.

## 4. Auth method: OTP code vs magic link

Both are supported by Supabase via the same `signInWithOtp` API. Recommendation: **stick with the 6-digit code** (already shipped, same UX for new and existing users, no callback page, works cross-device, no deep-link race with the open report tab). Magic-link would require a new `/auth/callback` route, deep-link handling, and breaks the "report already open" UX. No change to current setup.

## 5. Pending credits — storage strategy

No new "pending" table. The pending state is *the absence of a row* in `credit_ledger` with `reason='initial_grant'`. Rationale:
- Already enforced by `uniq_credit_ledger_initial_grant` (partial unique index, one row per lead).
- Balance = `SUM(delta)` → unverified leads naturally have balance 0.
- Report viewing only needs a `lead_session` cookie; it doesn't read the ledger.
- Avoids a second source of truth + reconciliation job.

UI shows pending state by checking `getBalance(leadId) === 0 && !hasInitialGrant`.

## 6. Idempotency

Already guaranteed:
- `grantInitialCredits` inserts into `credit_ledger (lead_id, reason='initial_grant')` and **swallows 23505** (unique violation) from the partial unique index. Calling it from `claim-new` *and* a possible legacy retry of `claim-existing` is safe.
- We add `metadata = { kind: 'signup_verified', verified_at: <iso> }` purely for admin observability — no new uniqueness logic.

## 7. Qualification storage

Add `leads.qualification TEXT` (nullable for legacy rows, required at the API for new submissions). Allowed values (constant in code, not a SQL CHECK so future tweaks don't need a migration):
`brand_company`, `marketing_comms`, `consultant_agency`, `content_creator`, `curiosity`, `other`.

Display labels (PT-PT) match the spec; mapping lives in `src/lib/leads/qualification.ts` so admin + onboarding share it. (We deliberately don't reuse `purpose` / `profile_ownership` because those are deprecated by the step-2 removal and have different semantics.)

## 8. Risks & edge cases

- **User closes tab before verifying.** Lead exists, no credits. They can re-enter with the same email → OTP path; `claim-existing` (or `claim-new` if no auth user yet) will issue the grant. Acceptable.
- **OTP email delivery delay.** UX must clearly say credits unlock after verification; resend cooldown already exists.
- **Same email submitted by two devices.** Defense-in-depth guard in `start.ts` already returns `EMAIL_REQUIRES_VERIFICATION`. No double-grant possible.
- **Disposable domain.** Hard reject at `/start` with field-level error; UI suggests using a different email. Don't silently accept and later block — that wastes user time.
- **Legacy leads (already have +2 credits).** Untouched; new flow only affects new leads.
- **Honeypot/timing already in place.** Keep.
- **OTP failure after `/start` returned 200.** Lead exists, no credits. Resend works. If user gives up, no abuse (zero balance).
- **`qualification` left blank on legacy admin edits.** Nullable in DB; required only at the public API path.
- **Auth provider conflicts.** Supabase OTP `shouldCreateUser=true` will create `auth.users` rows; ensure `handle_new_user` trigger doesn't break for leads created seconds earlier (it already runs `link_user_to_existing_reports` keyed by email — safe).

## 9. Step-by-step implementation

1. **Migration** — add `qualification` and `email_domain_class` to `leads`.
2. **Shared helpers** — `src/lib/leads/qualification.ts` (constants + labels) and `src/lib/leads/email-domain-class.ts` (classifier + disposable list).
3. **Server `/api/onboarding/start.ts`** — drop phone; require `qualification`; classify email domain → reject if disposable; **remove the `grantInitialCredits` call**; after upserting lead, call `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, data: { lead_id } } })`; return `{ ok, lead_id, credits: 0, verification_required: true }`.
4. **New server route `/api/onboarding/claim-new.ts`** — mirrors `claim-existing.ts`: validates the just-verified Supabase JWT, links `auth.users.id` ↔ `leads.id` via the existing `link_user_to_existing_reports` RPC, calls `grantInitialCredits` with `metadata.kind='signup_verified'`, refreshes `lead_session` cookie, returns new balance.
5. **Onboarding modal** — remove phone input from `FinalStepBody`; add qualification `Select` above the consent block; on successful `/start`, transition to OTP panel (variant `mode: 'new-account'`) instead of closing; on `verifyOtp` success call `/claim-new` and only then close + open report.
6. **OTP panel copy variant** — same component, props-driven copy ("Cria a tua conta — confirma o email" vs "Já tens conta — confirma o acesso").
7. **i18n** — add/replace keys, remove phone keys.
8. **Report shell hint (small)** — show a dismissible Info bar when `lead_session` exists and balance is 0 ("Confirma o teu email para activar 2 créditos"). Optional polish; safe to ship without.
9. **Build-payload + draft helpers + tests** — drop phone, add qualification, update unit tests in `src/lib/leads/__tests__/*` and `src/routes/api/onboarding/__tests__/*` if present.
10. **Admin (light touch)** — add `qualification` + `email_domain_class` columns to the leads admin list. No new filters in this round.
11. **Smoke test (preview)**
    - New email + professional domain → final form → report opens, OTP panel shows → confirm code → balance becomes 2.
    - New email + gmail → same flow (consumer, not blocked).
    - New email + mailinator → rejected at /start with field error.
    - Existing email → OTP path → balance unchanged (no double grant).
    - Abandon after /start → re-enter → guard routes to OTP → after verify, +2 credits granted exactly once.

## Out of scope (explicit)

- Magic-link flow / `/auth/callback` page.
- Rate limiting beyond what already exists.
- CAPTCHA.
- Free↔Pro gating, credit consumption, checkout, 30d/90d, competitor logic, report sections.
