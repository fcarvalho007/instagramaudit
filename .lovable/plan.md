## Goal

Cosmetic i18n cleanup post-smoke-test. No runtime, UI, or copy changes — only dead translation keys.

## Findings

Searched the codebase (`rg`) for usage of both legacy blocks:

- `microProof.*` (`fast`, `noSignup`, `gdpr`) → **0 code references**. Defined only in `src/i18n/locales/{pt,en}/landing.json`.
- `hero.trust.*` (`freeReports`, `publicData`, `freeAccount`) → **0 code references**. Also locale-only.
- No tests in `src/i18n/__tests__/` reference these keys.

The active trust copy in the hero today comes from `actionBar.trustInline.*` and `handwritten.freeReportsSuffix`, which remain untouched.

Since `microProof.noSignup` has no consumer, renaming it is pointless — the safer and cleaner action is to delete the whole `microProof` block and the unused `hero.trust` block. This satisfies tasks 1 and 3 (rename is not "safely possible" in the meaningful sense; removal is).

## Changes

1. `src/i18n/locales/pt/landing.json` — remove top-level `microProof` block and `hero.trust` block.
2. `src/i18n/locales/en/landing.json` — same removals (mirror).

No other files touched. No code, no JSX, no tracking, no routes, no DB.

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run src/i18n/__tests__/` (3 existing i18n tests; none reference the removed keys, expected to pass unchanged)
- Visual: hero unchanged — trust strip reads from `actionBar.trustInline.*`, not from removed keys.

## Output to user

- Files changed (2 JSON locales)
- Keys removed: `microProof.{fast,noSignup,gdpr}`, `hero.trust.{freeReports,publicData,freeAccount}` in PT and EN
- Confirmation that visible copy is unchanged (removed keys had no consumer)
- tsc + vitest results
