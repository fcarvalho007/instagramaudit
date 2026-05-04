
# Refinamento visual — "Melhores e piores publicações"

**Scope**: Single file edit — `src/components/report-redesign/v2/report-post-comparison.tsx`. No data/ranking logic changes.

---

## Changes

### A) VS Bar — stronger visual contrast

- Increase padding, use `rounded-2xl`, stronger gradient opacity (0.06 -> 0.10 for both blue/amber ends).
- Add horizontal coloured bars (thin progress-like strips) under each side's percentage.
- Enlarge VS badge to `size-11 md:size-12` with `shadow-md` and `border-2`.
- Increase percentage font size to `text-[22px] md:text-[26px]`.

### B) Remove duplicated percentages

- **Remove** the `engagementPct` display inside `PostCard` metrics row (line 432-439).
- **Remove** the `engPct` display from `RankRow` (lines 233-242).
- Percentages remain only in the VS Bar at the top and in the column header labels.

### C) Post Cards — more premium feel

- Increase thumbnail to `w-[80px] md:w-[88px]` (maintaining 3:4 aspect).
- Change to `rounded-2xl`, increase shadow, add `border-t-[3px]` accent.
- Remove duplicated format text from metadata line (already on thumbnail badge).
- Keep: date, caption (line-clamp-2), likes, comments.

### D) Mirrored card layout

- Best cards: thumbnail left, text right (current).
- Worst cards: thumbnail right, text left on desktop (`md:flex-row-reverse`).
- Mobile: both thumbnail left for readability.

### E) Central Divider — more editorial presence

- Increase `multiplierLabel` font to `text-[24px]`, add subtle `bg-surface-muted` pill behind it.
- "DIFERENÇA ENTRE EXTREMOS" slightly larger, `max-w-[80px]`.

### F) AI Reading Card — premium refinement

- Upgrade to `rounded-2xl`, increase gradient intensity.
- Increase icon circle to `size-9` with stronger tint.
- Headline size bump to `text-[18px] md:text-[20px]`.
- Add `border-l-4 border-accent-primary` or subtle left accent.

### G) Typography compliance

Already mostly correct — verify:
- Fraunces for headlines (AI card, section title).
- Inter for labels/body.
- JetBrains Mono only for numeric values (percentages, counts, multiplier).

---

## Files changed

1. `src/components/report-redesign/v2/report-post-comparison.tsx` — all visual changes

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run`
- Confirm no data/ranking logic changed
- Confirm percentages no longer duplicated
- Confirm thumbnails always 3:4
- Mobile 375px QA via browser tools
