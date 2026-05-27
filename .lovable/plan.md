## Context
The pre-analysis compatibility note already exists in `hero-action-bar.tsx` (rendered when no validation error is present) and the i18n keys `actionBar.personalHint` already exist in both PT and EN `landing.json`.

The only remaining gap is that the current copy uses "ou" / "or" instead of "/" as specified.

## Change
Update copy in both locale files to use "/" separator:

**PT (`src/i18n/locales/pt/landing.json`)**
From: "Funciona melhor com perfis públicos Creator **ou** Empresa..."
To:   "Funciona melhor com perfis públicos Creator**/Empresa**..."

**EN (`src/i18n/locales/en/landing.json`)**
From: "Works best with public Creator **or** Business profiles..."
To:   "Works best with public Creator**/Business** profiles..."

No component changes needed — `hero-action-bar.tsx` already renders `{t("actionBar.personalHint")}` in the correct position below the input bar.

## Validation
1. `bunx tsc --noEmit`
2. `bunx vitest run` if any test references the hint copy
3. Visual check at 390px mobile and desktop to confirm readability

## Do Not Change
- Apify logic, cache, analysis pipeline
- Report UI, pricing, gates, emails, admin