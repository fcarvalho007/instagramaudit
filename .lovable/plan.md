## Scope

Second visual pass on `overview/frequency-card.tsx` and
`overview/format-card.tsx`. CSS-only. No data, logic, routes, payments,
providers.

Both cards stack full-width in a single column (see
`report-overview-block.tsx` lines 202–221), so the available width on
desktop is the full report column (~960px inside the shell).

## Findings

After pass 1:
- titles already share the same class string, but the responsive ramp
  (`text-[1.125rem] → 1.25rem → 1.5rem`) makes them feel small on
  desktop relative to other report headings.
- frequency calendar cells are now square and capped to 440px, but the
  3-row block still reads as the centre of gravity of the card.
- format thumbnails at `md:grid-cols-6` (12 items → 6×2) on a 960px
  column give ~150px thumbs — but the card lives in a constrained
  inner padding band, and the user reports they still feel small. A
  4-column desktop grid (3 rows of 4) at ~220px each is the editorial
  sweet spot and matches Iconosquare-style post tiles.

## Changes

### 1. Unified, slightly larger card title (both cards)

Replace the current title classes on both cards with:

```
font-display text-[1.25rem] sm:text-[1.5rem] md:text-[1.75rem]
font-semibold tracking-tight text-content-primary leading-[1.15]
```

Same value on both cards → identical editorial presence. Subtitle
unchanged.

### 2. Frequency calendar — less dominant

In `frequency-card.tsx`:
- Tighten the calendar max width from `max-w-[440px]` to
  `max-w-[360px]` so each cell sits at ~45px on desktop (down from
  ~55px).
- Reduce inter-cell gap from `gap-1` to `gap-[3px]` and the
  weekday-header gap from `gap-1 md:gap-1.5` to `gap-[3px]`.
- Drop the 2-count number overlay font from `text-[10px] font-bold` to
  `text-[9px] font-semibold` so it stays readable but visually quieter.
- Reduce the muted state contrast by switching cell background from
  `rgb(241,245,249)` to `rgb(244,247,251)` (one tone calmer) — keeps
  the green hierarchy but lowers overall density.

### 3. Format thumbnails — more presence on desktop

In `format-card.tsx`:
- Grid: `grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4`
  (12 posts → 3×4 mobile, 4×3 from sm upward). At ~960px column this
  gives ~220px thumbnails on desktop.
- Keep `gap-2` and `aspect-square`.
- Bump the bottom-right format dot from `size-2` to `size-2.5` and
  fallback icon from `size-6` to `size-8` so they read at the new
  thumb size.

### 4. Editorial system parity (already in place)

Both cards keep the same outer padding (`px-5 md:px-6`), same header
rhythm (`pt-5 md:pt-6 space-y-2`), same eyebrow class
(`text-eyebrow-sm text-content-tertiary`), same insight callout margin.
No additional changes needed.

## Files changed

- `src/components/report-redesign/v2/overview/frequency-card.tsx`
- `src/components/report-redesign/v2/overview/format-card.tsx`

## Validation

- `bunx tsc --noEmit` → expect exit 0.
- Visual sanity: card titles now read as equal-weight editorial
  headings; calendar occupies clearly less vertical/horizontal weight;
  thumbnails on desktop are obviously larger and legible without
  ballooning the card.

## Out of scope

Data, scoring, copy, gating, payments, EuPago, onboarding, credits,
providers, admin, routes, schema, i18n keys.