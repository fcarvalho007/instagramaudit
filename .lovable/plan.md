## Scope

Visual/UI-only refinement of homepage hero + right-side preview. No onboarding, report, credits, pricing, tracking, or backend changes. Dark hero stays dark; product/report stay light.

## Files to change

1. **`src/components/layout/header.tsx`** — remove the non-functional Moon theme toggle (button + `Moon` import). The header is shared via `__root.tsx > AppShell`, and the button has no onClick today. Removing it satisfies "remove from marketing" while leaving the product/report's own theme controls untouched (they live in report shells, not in this header).

2. **`src/components/landing/blur-reveal-text.tsx`** — add two optional props:
   - `highlightTailWords?: number` (e.g. `2`)
   - `highlightClassName?: string`
   When set, the last N words render with the extra className (used to color "em segundos." in `var(--hero-cyan)`). Animation behavior unchanged.

3. **`src/components/landing/hero-section.tsx`**
   - H1: reduce mobile size — `text-3xl sm:text-4xl md:text-5xl lg:text-6xl` (was `text-4xl md:text-5xl lg:text-6xl`). Add `max-w-[18ch] mx-auto lg:mx-0` so line breaks land cleanly on 360/390.
   - Pass `highlightTailWords={2}` + `highlightClassName="text-[var(--hero-cyan)]"` to the headline BlurRevealText.
   - Subtitle: bump contrast — add `style={{ color: "var(--hero-fg-muted)" }}` to ensure AA on dark.
   - Tighten vertical rhythm on mobile: `py-12 md:py-24 lg:py-28` and `space-y-5 md:space-y-7`.
   - Reduce min-height on mobile so preview appears sooner: `min-h-[auto] lg:min-h-[calc(100dvh-4rem)]`.

4. **`src/components/landing/hero-report-preview.tsx`**
   - Browser chrome: keep the URL pill **visually present but empty** — remove the `<span>{t("hero.previewMock.urlBar")}</span>` text, keep the bordered pill `div` for shape.
   - Premium rows: reduce from 4 to **3** (`diagnostic`, `content`, `comparison`). Drop `reach`.
   - Show the locked-rows block on **all viewports** (remove `hidden lg:block`) so mobile also communicates "there is more inside". Keep it compact: `space-y-1.5` and 3 rows max.
   - Remove the **footnote block** entirely (the `<div>` containing `t("hero.previewMock.footnote")` and its top border).
   - Slight frost upgrade on rows: add `backdrop-blur-sm` and a faint divider line above the locked group ("1 de 6 secções acessíveis" stays as is via `hero.previewMock.sidebar`).

5. **`src/i18n/locales/pt/landing.json` + `src/i18n/locales/en/landing.json`**
   - Remove unused keys (no consumer after the edits): `hero.previewMock.urlBar`, `hero.previewMock.footnote`, `hero.previewMock.premiumRows.reach`.
   - All other keys unchanged. Headline copy unchanged.

6. **`src/i18n/locales/{pt,en}/header.json`** — remove the now-unused `aria.theme` key if present (only after confirming no other consumer; otherwise leave it).

## Out of scope (explicitly untouched)

- `HeroActionBar`, onboarding modal, `/api/onboarding/start`, `/api/analyze-public-v1`, credits, premium CTAs, pricing, report routes, tracking, DB.
- `actionBar.trustInline.*` copy (already "Oferta de 2 relatórios grátis" + "Acesso apenas a dados públicos" — aligned with onboarding-first flow, no "sem registo" wording).
- Other landing sections below the hero (SocialProof, HowItWorks, ProductPreview).

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run src/i18n/__tests__/ src/components/landing/__tests__/` (existing tests should pass; no new tests added since this is visual)
- Visual QA at 360×800, 390×844, 1440×900 via browser tools:
  - Theme toggle gone from header
  - H1 fits 2–3 lines on 360, "em segundos." cyan
  - Subtitle legible (AA contrast)
  - Preview shows: empty browser bar → score block → 2 KPI cards → "1 de 6 secções acessíveis" → 3 frosted locked rows
  - No footnote sentence anywhere
  - Mobile preview sits cleanly below CTA, no oversized empty space

## Deliverables to user

- Files changed list
- Summary of visual changes (header, H1, subtitle, preview)
- Confirmation: no onboarding/report/backend behavior touched
- Remaining visual risks (e.g. very long EN headline on 320px — fallback is text wrap)
