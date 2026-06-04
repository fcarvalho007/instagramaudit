## Scope

Visual-only refinement of the two free-report cards on `/analyze/$username`:
`overview/frequency-card.tsx` ("Frequência de publicação") and
`overview/format-card.tsx` ("Formato pouco variado"). No data, scoring,
copy logic, gating, payments, providers, routes or schema touched.

## Findings

Both card titles already share the same Tailwind classes
(`font-display text-[1.125rem] sm:text-[1.25rem] md:text-[1.5rem] font-semibold tracking-tight leading-tight`).
The inconsistency the user feels comes from:

- frequency card outer padding `px-4 sm:px-5 md:px-6` vs format card
  `px-5 md:px-6` (mobile mismatch).
- calendar cells use `aspect-[4/3]` over full 7-col width → on desktop
  each cell becomes ~60×45px, dominating the card.
- thumbnail grid uses `grid-cols-6 sm:grid-cols-10 md:grid-cols-12` for
  12 posts → single tight row on desktop, thumbs ~40px wide.
- subtle eyebrow inconsistencies (one uses `text-eyebrow-sm`, the other
  `text-xs uppercase tracking-[0.04em]`).

## Changes

### 1. Title system (shared)

Keep the existing class string but normalize the two headers so they are
identical (same padding-top, same `space-y-2`, same eyebrow style). No
new component, no new tokens — pure class normalization. Both cards end
up with:

- header wrapper: `px-5 md:px-6 pt-5 md:pt-6 space-y-2`
- title: existing `font-display text-[1.125rem] sm:text-[1.25rem] md:text-[1.5rem] font-semibold tracking-tight text-content-primary leading-tight`
- subtitle: existing `text-[14px] text-content-secondary leading-relaxed`

### 2. Frequency card — calendar compaction

Inside `frequency-card.tsx` only:

- Cap the calendar's horizontal footprint on desktop so cells stay small
  and elegant. Wrap the calendar grid in `max-w-[440px]` (left-aligned)
  so on ≥md the 7 columns produce ~55px cells max; mobile keeps full
  width.
- Change cell aspect from `aspect-[4/3]` to `aspect-square` for a calmer
  geometry, and keep `gap-1`.
- Tighten weekly-rhythm padding from `px-5 sm:py-5` to `px-4 py-4` and
  reduce `BAR_MAX` from 36 to 28 so the rhythm chart is more compact
  and proportional with the smaller calendar.
- Normalize outer padding to `px-5 md:px-6` (drop the `sm:` step) to
  match the format card.
- Keep legend, eyebrow, insight callout and all i18n strings untouched.

### 3. Format card — thumbnail proportion

Inside `format-card.tsx` only:

- Replace `grid-cols-6 sm:grid-cols-10 md:grid-cols-12` with
  `grid-cols-3 sm:grid-cols-4 md:grid-cols-6` so 12 posts render as
  3×4 mobile / 4×3 tablet / 6×2 desktop. Bumps desktop thumb size from
  ~40px to ~90–110px — premium and legible without ballooning.
- Increase gap from `gap-1.5` to `gap-2` for editorial breathing.
- Bump the small format dot from `size-1.5` to `size-2` and the
  fallback icon from `size-5` to `size-6` so they read at the larger
  thumbnail size.
- Switch the "12 posts analisados" eyebrow from local
  `text-xs uppercase tracking-[0.04em]` to the shared `text-eyebrow-sm
  text-content-tertiary` class used by the frequency card.

### 4. Spacing harmony

- Same outer padding (`px-5 md:px-6`) on both cards.
- Same `pt-5 md:pt-6` on both headers.
- Same `mb-5 sm:mb-6` on the insight callout (already aligned).

## Files changed

- `src/components/report-redesign/v2/overview/frequency-card.tsx`
- `src/components/report-redesign/v2/overview/format-card.tsx`

No other files touched. No new components, no new tokens, no i18n keys
added or renamed.

## Validation

1. `bunx tsc --noEmit` — expect exit 0.
2. Browser QA on `/analyze/frederico.m.carvalho` at 360, 390, 768, 1440
   viewports. Verify:
   - both card titles render at the same scale and feel,
   - calendar cells are clearly smaller on desktop and do not dominate,
   - rhythm chart and calendar feel balanced,
   - thumbnails on desktop are visibly larger (6×2) and legible on mobile (3×4),
   - no horizontal overflow, no awkward title wrap.

## Out of scope (confirmed untouched)

Data fetching, scoring (`computeFrequencia`, `getFormatVariationStatus`),
copy logic, premium gating, payments, EuPago, onboarding, credits,
Apify/OpenAI/DataForSEO, admin, routes, DB schema, i18n strings.