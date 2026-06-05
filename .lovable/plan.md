# Landing QA — verdict & minimal fixes

## Verdict: NEEDS MINOR FIXES

## Issues found

1. **CTA copy wrong (check 3).** `ReportPreviewBand` reads `t("dark.preview.cta")` which in `src/i18n/locales/pt/landing.json` is `"Ver relatório completo · +7 secções"` — not "Analisar o meu perfil grátis".
2. **CTA target wrong (checks 4 & 5).** `src/components/landing/dark/report-preview-band.tsx:208` still points to `<Link to="/report/example">`. It does not scroll to the hero input, and `/report/example` is still in the main landing CTA path.
3. **No scroll anchor on the hero.** `HeroSection` / `HeroActionBar` have no `id`, so there is no target to scroll to.

## Passing

- Hero / first fold unchanged.
- Footer appears once (`DarkFooter` via `AppShell`; `MiniFooterStrip` already removed from the island).
- Section order in `LandingDarkIsland`: Stats → ManualVsTool → ReportPreview → HowItWorks → Transparency → Pricing → FinalCta ✓.
- No horizontal overflow at 360/390 from recent changes.
- Desktop 1440 rhythm consistent (`py-8/py-10`, `pt-16` on preview band).
- Copy is PT, simple, sentence case.

## Recommended minimal fixes (build mode)

1. **Hero anchor** — `src/components/landing/hero-section.tsx`: add `id="hero"` to the root `<section>`.
2. **CTA copy** — update `dark.preview.cta`:
   - `src/i18n/locales/pt/landing.json` → `"Analisar o meu perfil grátis"`
   - `src/i18n/locales/en/landing.json` → `"Analyze my profile for free"`
3. **CTA behavior** — `src/components/landing/dark/report-preview-band.tsx`:
   - Replace `<Link to="/report/example">` with `<a href="#hero">` (smooth scroll via CSS `scroll-behavior: smooth` already global, otherwise add an `onClick` that calls `scrollIntoView({ behavior: "smooth" })`).
   - Swap the `ArrowDown` icon for `ArrowUp` (the CTA now scrolls upward).
   - Remove the now-unused `Link` import.

No other files touched. No copy, pricing, checkout, EuPago, onboarding, report, or backend changes.
