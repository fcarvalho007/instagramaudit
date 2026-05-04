
# Visual Refinement: PostComparisonBlock

**File changed:** `src/components/report-redesign/v2/report-post-comparison.tsx` (single file, visual only)

**No changes to:** ranking logic, topPosts/bottomPosts selection, engagement calculations, AI insight generation, backend, other blocks, locked files.

---

## 1. VS Bar

- Softer gradient background: blue tint left → transparent center → amber tint right (reduce current opacity from 0.10 to ~0.06 for subtlety).
- Reduce border from `border-border-default` to `border-border-subtle` for a lighter feel.
- VS badge: remove `shadow-md`, use `shadow-sm` instead. Reduce border to `border border-border-default` (from `border-2`).
- Slightly reduce percentage font size on mobile (from `text-[22px]` to `text-[20px]`) for breathing room.
- Progress bars: increase height from `h-1.5` to `h-2` with softer rounding for better visual weight.

## 2. Post Cards

- Thumbnail: upgrade from `rounded-lg` to `rounded-xl` for consistency with card radius.
- Reduce card shadow to `shadow-[0_1px_8px_-3px_rgba(0,0,0,0.06)]` (lighter, more premium).
- Top accent border: keep `border-t-[3px]` but reduce to `border-t-2` for subtlety.
- Date metadata: keep as-is (already compact).
- Metrics row: reduce `gap-3.5` to `gap-3`, keep `border-t border-border-subtle`.

## 3. Layout

- Increase central divider area: `px-5` → `px-8` and `min-w-[90px]` → `min-w-[100px]`.
- Best column: `md:pr-6` → `md:pr-8`; Worst column: `md:pl-6` → `md:pl-8`.
- RankRow: no changes needed (already clean).

## 4. Central Divider

- Multiplier pill: add `border border-border-subtle` to the pill for definition.
- Reduce font from `text-[24px]` to `text-[22px]` — memorable but not dominant.
- "DIFERENÇA ENTRE EXTREMOS" label: keep as-is.
- Vertical lines: keep `bg-border-default`.

## 5. AI Reading Card

- Add a left accent line: `border-l-[3px] border-l-accent-primary` on the card.
- Soften gradient opacity from 0.07 to 0.05.
- Icon circle: keep current `bg-tint-primary` with Sparkles icon.
- Fallback headline: already uses `font-display` — confirmed correct.
- Fallback body: already `text-content-secondary` — no change.
- Ensure children (AI insight) div does not render empty whitespace when no AI content.

## 6. Mobile (375px)

- All changes use responsive prefixes already in place.
- VS bar `min-w-[80px]` unchanged — fits at 375px.
- Mobile difference marker: no changes needed.
- Cards stack in single column naturally via `grid-cols-1`.
- No new elements that could cause overflow.

---

## Hardcoded decorative values (documented)

- VS bar gradient: `rgba(37,99,217,0.06)` / `rgba(217,119,6,0.06)`
- AI card gradient: `rgba(37,99,217,0.05)` / `rgba(217,119,6,0.05)`
- Card shadow: `rgba(0,0,0,0.06)`
- AI card left border uses token `border-l-accent-primary`

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run`
