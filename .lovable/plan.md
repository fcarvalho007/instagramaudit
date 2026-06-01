# Phase 3 — Tests

## Constraint surfaced first

`vitest.config.ts` runs in `environment: "node"` and only picks up `**/__tests__/**/*.test.ts` — there is **no jsdom or React Testing Library** wired up. Every existing test in the repo (`extractUsername`, `unlock-flow`, `pricing-feedback`, etc.) is pure logic / pure data.

Per scope ("tests only, plus minimal fixes if a test exposes a real bug"), I will **not** add jsdom + RTL infra in this turn. Instead I will lock the Phase 3 contract at the two layers that actually carry the bug risk:

1. The **fetch client** that the analyze route branches on (`ONBOARDING_REQUIRED` / `INSUFFICIENT_CREDITS` must pass through verbatim).
2. The **i18n copy** the user sees (no raw `402` / `ONBOARDING_REQUIRED` leak; modal intro keeps `@handle` + `1/2` credits expectation line).

The HeroActionBar → OnboardingModal render-level assertions and the analyze-route render assertions cannot be expressed with the current infra. They will be listed as a remaining manual smoke checklist.

## Files to add

### 1. `src/lib/analysis/__tests__/fetch-public-analysis-onboarding.test.ts`

Mocks `globalThis.fetch` and asserts `fetchPublicAnalysis`:

- preserves `error_code: "ONBOARDING_REQUIRED"` on 402 (so `analyze.$username.tsx` can reopen the modal)
- preserves `error_code: "INSUFFICIENT_CREDITS"` on 402 (so the route renders friendly copy)
- maps a thrown network failure to `error_code: "NETWORK_ERROR"` (never raw)
- forwards a `{ success: true }` envelope unchanged
- POSTs to `/api/analyze-public-v1` with handle cleaned (no `@`, trimmed) and competitors cleaned + capped at 2

### 2. `src/i18n/__tests__/onboarding-copy.test.ts`

Imports `en/errors.json`, `pt/errors.json`, `en/gate.json`, `pt/gate.json` and asserts, per locale:

- `errors.ONBOARDING_REQUIRED` exists, is >10 chars, does **not** match `/\b(402|payment required|onboarding_required|insufficient_credits)\b/i`
- `errors.INSUFFICIENT_CREDITS` exists, same anti-leak guard
- `gate.onboarding.intro.handleContext` contains the `{{handle}}` placeholder
- `gate.onboarding.intro.creditNote` contains both `1` and `2`
- `gate.onboarding.intro.freeValue` is an array with ≥3 items
- `gate.onboarding.intro.cta` exists and is a short label
- `gate.onboarding.errors.generic` and `.network` exist and are leak-free

## What this does NOT cover (manual smoke required)

- HeroActionBar: submitting a valid handle opens `OnboardingModal` and does **not** navigate or call `/api/analyze-public-v1` before `/api/onboarding/start` succeeds.
- HeroActionBar: invalid handle shows validation error and does **not** open the modal.
- OnboardingModal: completing Step 5 calls `POST /api/onboarding/start` with the correct payload.
- analyze.$username: `ONBOARDING_REQUIRED` actually reopens the modal in the live DOM.
- UnlockModal post-report regression.

These need either (a) a follow-up turn that adds `jsdom` + `@testing-library/react` to `vitest.config.ts` and brings in real component tests, or (b) a manual preview pass against the checklist.

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run` — expect all new tests green, no existing test impacted

## Risk

- Zero production code touched. Only two new test files under `__tests__/`.
- If a leak guard fires (e.g. someone later inlines a raw code into the JSON), the test surface is the JSON copy, which is trivial to fix.

## Checkpoint

- ☐ Switch to build mode
- ☐ Add `src/lib/analysis/__tests__/fetch-public-analysis-onboarding.test.ts`
- ☐ Add `src/i18n/__tests__/onboarding-copy.test.ts`
- ☐ Run `bunx tsc --noEmit`
- ☐ Run `bunx vitest run` and report Phase 3 tests
- ☐ Output manual smoke checklist for the render-level assertions not coverable today
