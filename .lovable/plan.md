# Shorter copy + clearer hierarchy below the hero

## Scope
Copy-only + minor className tweaks for typographic hierarchy. No structural changes, no new components, no new libs, no CTA changes, no animation changes. Hero, pricing values, checkout, EuPago, onboarding, report generation, backend, admin, routes, DB, providers — untouched.

## A. Copy edits (PT + EN parity)

Edit `src/i18n/locales/pt/landing.json` and `src/i18n/locales/en/landing.json`, only inside the `dark.*` namespace:

### `dark.preview`
- `lead` PT → "Métricas, benchmark e concorrentes — num só relatório." / EN → "Metrics, benchmark and competitors — all in one report."
- `disclaimer` PT → "Exemplo. Os números reais vêm do teu perfil." / EN → "Example. Real numbers come from your profile."

### `dark.manualVsTool` — reduce from 4 → 3 bullets per column
Replace `manual.item1..item4` with `item1..item3`; same for `tool`. Drop `item4` keys.

Manual (PT / EN):
1. "Abrir perfis um a um" / "Open profiles one by one"
2. "Contar formatos e publicações" / "Count formats and posts"
3. "Tirar conclusões à mão" / "Draw conclusions by hand"

AuditProfiles (PT / EN):
1. "Relatório em segundos" / "Report in seconds"
2. "Métricas calculadas automaticamente" / "Metrics calculated automatically"
3. "Prioridades claras" / "Clear priorities"

Also update `manual-vs-tool-band.tsx` to read only `item1..item3` (remove the 4th entry in both arrays).

### `dark.how` — one short line per step
- `step1.desc` PT → "Coloca o @ do perfil." / EN → "Enter the profile's @."
- `step2.desc` PT → "Analisamos dados públicos." / EN → "We analyze public data."
- `step3.desc` PT → "Mostramos o que melhorar." / EN → "We show what to improve."

(Titles kept as-is; only descriptions shortened.)

### `dark.transparency` — drop long paragraph
- Remove the `body` key from both locales.
- Keep `eyebrow`, `headline`, `audience`, `chips.*` intact.
- In `transparency-band.tsx`, remove the `<p>{t("dark.transparency.body")}</p>` block; keep the `audience` line.

### `dark.finalCta.lead`
- PT → "Grátis. Sem cartão. Em segundos."
- EN → "Free. No card. In seconds."

## B. Typographic hierarchy

Goal: product sections look more important than support sections.

Product sections (larger H2 — `text-3xl sm:text-4xl`):
- `report-preview-band.tsx` H2: `text-2xl sm:text-3xl` → `text-3xl sm:text-4xl`
- `pricing-teaser-band.tsx` H2: bump to `text-3xl sm:text-4xl` (verify current size and apply the same delta)

Support sections (compact — `text-xl sm:text-2xl`, reduced vertical padding):
- `stats-band.tsx` H2 already `text-2xl sm:text-[27px]` → `text-xl sm:text-2xl`; section padding `py-12 sm:py-14` → `py-10 sm:py-12`
- `manual-vs-tool-band.tsx` H2 → `text-xl sm:text-2xl`; padding `py-14 sm:py-16` → `py-10 sm:py-12`
- `how-it-works-band.tsx` H2 → `text-xl sm:text-2xl`; padding `py-14 sm:py-16` → `py-10 sm:py-12`
- `transparency-band.tsx` H2 already small (`text-2xl sm:text-[26px]`) → `text-xl sm:text-2xl`; padding `py-14 sm:py-16` → `py-10 sm:py-12`

FinalCtaBand keeps its current larger H2 (`text-3xl sm:text-[34px]`) and `dark-spotlight` — it's the closing moment.

No new colors, fonts, gradients, libraries, or animations. No changes to `dark-card`, `dark-eyebrow`, or token files.

## C. Files touched (final list)
1. `src/i18n/locales/pt/landing.json`
2. `src/i18n/locales/en/landing.json`
3. `src/components/landing/dark/manual-vs-tool-band.tsx`
4. `src/components/landing/dark/how-it-works-band.tsx` (none — desc keys already used, only JSON changes)
5. `src/components/landing/dark/transparency-band.tsx`
6. `src/components/landing/dark/report-preview-band.tsx`
7. `src/components/landing/dark/pricing-teaser-band.tsx`
8. `src/components/landing/dark/stats-band.tsx`
9. `src/components/landing/dark/final-cta-band.tsx` (none — only JSON change)

(Item 4 and 9 likely no code edit; included for traceability.)

## D. Validation
- `bunx tsc --noEmit`
- Preview at viewport 1440 (desktop) and 390 (mobile): confirm no horizontal overflow, no orphan whitespace, product H2s feel heavier than support H2s, page is visibly shorter.
- Confirm CTAs, links, and routes are untouched.

## Out of scope
- `ReportPreviewBand` CTA structure
- Any restructuring or removal of sections
- New libs / Aceternity / 21st.dev
- Pricing values, hero, footer, payments, onboarding, backend
