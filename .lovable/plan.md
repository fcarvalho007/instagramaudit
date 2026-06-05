# Simplify landing below the hero fold

## Scope
Drop two repetitive bands and fold the personas message into a single discreet line inside `TransparencyBand`. No changes to hero, payments, checkout, onboarding, report generation, backend, admin, or footer.

## Files to change

### 1. `src/components/landing/dark/landing-dark-island.tsx`
- Remove the imports for `BentoMetricsBand` and `PersonasBand`.
- Remove `<BentoMetricsBand />` and `<PersonasBand />` from the JSX sequence.
- Leave `MiniFooterStrip` alone (per "do not touch footer beyond what was already fixed").
- Final order inside the island:
  1. `StatsBand`
  2. `ManualVsToolBand`
  3. `ReportPreviewBand`
  4. `HowItWorksBand`
  5. `TransparencyBand`
  6. `PricingTeaserBand`
  7. `FinalCtaBand`
  8. `MiniFooterStrip` (untouched)

Component files for `BentoMetricsBand` and `PersonasBand` stay on disk (not deleted) to avoid breaking any other importers; only the rendering is removed.

### 2. `src/components/landing/dark/transparency-band.tsx`
Add a short audience line under the body paragraph in the left column:

```tsx
<p
  className="text-xs mt-3"
  style={{ color: "rgb(var(--hero-text-tertiary))" }}
>
  {t("dark.transparency.audience")}
</p>
```

Discreet, single line, same column — not a new section.

### 3. i18n copy

`src/i18n/locales/pt/landing.json` → inside `dark.transparency`:
```json
"audience": "Feito para consultores, social media managers, marcas e criadores."
```

`src/i18n/locales/en/landing.json` → inside `dark.transparency`:
```json
"audience": "Built for consultants, social media managers, brands and creators."
```

## Validation
- `bunx tsc --noEmit`
- Visit `/` in preview, scroll below the hero, confirm:
  - No bento metrics grid
  - No personas section
  - Transparency block shows the new audience line
  - No visible empty gap between `HowItWorksBand` and `TransparencyBand`
  - Section order matches the list above
- Confirm hero, pricing values, checkout, onboarding, report generation, backend, admin untouched (no edits outside the 3 files listed).

## Out of scope
- Deleting `bento-metrics-band.tsx` / `personas-band.tsx` files
- Footer / `MiniFooterStrip` changes
- Any copy changes outside the new `audience` key
