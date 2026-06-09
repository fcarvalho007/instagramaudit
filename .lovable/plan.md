## Status

The simplified report-entry modal flow is already implemented and matches all the confirmed decisions in your brief. Verifying file by file:

- **Entry modal** (`onboarding-modal.tsx`): two explicit paths — primary "Criar conta grátis" card + secondary "Já tens conta? Entrar com email" — no phone field rendered.
- **Old step 2**: removed. Flow is now `entry → final form → OTP panel`.
- **Final step**: two-column editorial layout (dark navy left / light form right), stacks on mobile, includes qualification select, consent + marketing checkboxes, "Gerar o meu relatório" CTA, RGPD footnote.
- **Auth/verification**:
  - New email → `/api/onboarding/start` creates lead with 0 credits, opens report, triggers Supabase OTP, shows "Confirma o teu email para activar os 2 créditos grátis".
  - Existing email → `/api/onboarding/start` returns 403 → OTP panel in `existing` mode shows "Esta conta já existe…".
  - Verification → `/api/onboarding/claim-existing` calls `grantInitialCredits()`.
- **Credit ledger**: idempotent via existing `uniq_credit_ledger_initial_grant` partial unique index; second verification is a no-op.
- **Lead data**: `qualification` + `email_domain_class` columns added by migration `20260609123115_…`; disposable domains blocked at `/start`.
- **Tests**: `start.test.ts` and `build-start-payload.test.ts` already cover phone removal, disposable rejection, and existing-email 403.

## Remaining delta

Only one cleanup is left: the `phone` field still exists as a vestigial optional field in the form schema and draft persistence (it is never rendered to the user, but lives in `unlock-flow.ts`, `use-onboarding-draft.ts`, and modal defaults). Removing it makes the codebase match the brief literally and prevents stale drafts from carrying old phone values forward.

### Files to edit

1. `src/lib/unlock-flow.ts` — drop `phone` from the Zod schema (line 101) and from `UnlockFormValues`.
2. `src/components/onboarding/onboarding-modal.tsx` — remove `phone: ""` from `defaultValues` (line 124).
3. `src/lib/leads/use-onboarding-draft.ts` — drop `phone` from the draft schema, persistence, and hydration (lines 27, 94, 125, 141, plus the comment on line 10/78).
4. `src/lib/leads/__tests__/use-onboarding-draft.test.ts` — remove the `phone` fixture assertions.
5. `src/lib/leads/__tests__/build-start-payload.test.ts` — keep the "never includes phone" guard but drop the `phone` field from the input fixture so it matches the new type.

No other files need changing. No DB migration, no auth config change, no edge function change.

## Risks

- Existing users with a persisted localStorage draft that still has `phone` → harmless: Zod will `safeParse` and drop unknown keys (already the behavior); no crash.
- TypeScript will flag any remaining `phone` references outside the listed files. None found in the codebase scan.

## Deliverables after implementation

1. Files changed: the 5 above.
2. Removed: `phone` field (schema + draft) — the UI input was already gone.
3. Verification behavior: unchanged from current implementation (already correct).
4. Signup credit protection: unchanged (`uniq_credit_ledger_initial_grant`).
5. Qualification storage: unchanged (`leads.qualification` column).
6. Manual QA: trigger a new-email signup, confirm OTP arrives, verify balance jumps from 0 → 2 after confirmation; retry verification and confirm balance stays at 2; trigger an existing-email entry and confirm no duplicate account is created.

Approve to switch to Edit Mode and apply the cleanup.
