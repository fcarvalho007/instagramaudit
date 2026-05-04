
# Polish pass — Best vs Worst posts comparison

**Single file changed:** `src/components/report-redesign/v2/report-post-comparison.tsx`

No backend/data changes. No concept redesign. Pure CSS/layout refinement.

---

## 1. Spacing and rhythm

- Outer `space-y-6` → `space-y-8` for breathing room between header, grid, and AI box.
- PostGroup inner `space-y-3` → `space-y-4` so cards separate from group header.
- Card internal padding `p-3.5` → `p-4` for consistency.
- Metric row `pt-1.5` → `pt-2` and `gap-4` → `gap-5` for less cramped feel.
- Grid gap `gap-5 md:gap-6` → `gap-6 md:gap-8` for clear column separation.

## 2. Card alignment and height normalisation

- Fix thumbnail to `w-[88px] md:w-[96px]` (slightly narrower on desktop to give text more room).
- Content area: add `min-h-[120px]` so cards with short captions match height of longer ones.
- Caption: `line-clamp-2` stays, add fixed `h-[2.5rem]` (2 lines at 13px leading-snug) so metric row baseline is stable.
- Date + rank row: explicit `h-5` so chips align across cards.

## 3. Colour tuning

Replace hardcoded emerald/amber with softer, more Iconosquare-aligned tones:

**Best side (success)**:
- Group header bg: `bg-emerald-50/60` → `bg-sky-50/50`
- Border: `border-emerald-200/60` → `border-sky-200/50`
- Text: `text-emerald-700` → `text-sky-700`
- Rank chip: same sky family
- Engagement %: `text-emerald-600` → `text-sky-600`

**Worst side (informative, not alarming)**:
- Group header bg: `bg-amber-50/60` → `bg-slate-100/60`
- Border: `border-amber-200/60` → `border-slate-200/60`
- Text: `text-amber-700` → `text-slate-500`
- Rank chip: `bg-slate-100 text-slate-500 border-slate-200/60`
- Engagement %: `text-amber-600` → `text-slate-400`

This creates a calm best (blue) vs neutral worst (grey) contrast — analytical, not traffic-light.

## 4. Section header hierarchy

- Eyebrow: keep `text-eyebrow-sm text-slate-500` as is.
- H3 title: bump to `text-[24px] md:text-[28px]` and `font-bold` for stronger anchor.
- Support text: keep current sizing.

## 5. Group label polish

- Group header pill: `rounded-xl` → `rounded-lg`, reduce `px-3.5 py-2.5` → `px-3 py-2` for tighter profile.
- Icon size stays `size-4`.

## 6. AI insight box

- Wrap `renderInsight()` in a container with `mt-2` to tighten connection to the grid above (currently double-spaced by outer `space-y-8`).

## 7. Mobile refinements

- Thumbnail: keep `w-[88px]` on mobile (no change needed).
- Caption height constraint ensures cards stay compact on mobile.
- Metric row: keep `text-[12px]` but ensure `flex-wrap` is absent (row should not wrap).

## 8. Card shadow refinement

- Current multi-layer shadow is good; keep it.
- Hover state: soften slightly — `hover:shadow-[0_2px_6px_rgba(15,23,42,0.06)]` instead of `0.08`.

---

## Validation

- `bunx tsc --noEmit` and `bunx vitest run` after changes.
- Visual check: section reads in under 3 seconds, best vs worst instantly clear, cards aligned, colours balanced, mobile clean.
