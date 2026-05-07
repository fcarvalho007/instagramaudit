
# First Fold UI Refinement — Typography, Spacing & Hierarchy

Three files to edit. No data/logic changes.

---

## 1. `report-hero-v2.tsx` — Hero card & top bar

### Top bar
- Reduce `mb-4` → `mb-3` for tighter connection to hero card
- "Novo relatório" CTA: bump to `font-bold`, add `shadow-sm`, slightly larger padding `px-4 py-2.5`
- Breadcrumb: keep as-is (already light `text-xs text-content-tertiary`)
- Status pill: keep as-is (already secondary)

### Profile area (identity block)
- **Handle (`h1`)**: increase to `text-2xl sm:text-[28px]`, keep `font-display font-semibold` — this becomes the clear visual anchor
- **Full name + bio**: split into two lines instead of joining with " · "
  - Full name: `text-sm font-medium text-content-secondary`
  - Bio: `text-sm font-normal text-content-tertiary leading-relaxed` (lighter, clearly secondary)
- Avatar: keep current size (`size-14 md:size-[72px]`), simplify ring to single `border-2 border-border-default` instead of double-wrap gradient ring (cleaner)
- Reduce profile area padding: `py-5 sm:py-6` → `py-4 sm:py-5`, `px-5 sm:px-7` → `px-5 sm:px-6`
- Better vertical alignment: ensure `md:items-start` instead of `md:items-center` for text block beside avatar

### KPI strip
- Reduce padding: `py-5` → `py-4`, `px-5 sm:px-7` → `px-5 sm:px-6`
- Numbers: `text-2xl sm:text-3xl` → `text-xl sm:text-2xl font-bold` — strong but not oversized
- Labels: keep `text-eyebrow-sm text-content-tertiary` (already understated)
- Vertical dividers: add `pl-4` on divider columns for balanced spacing
- Border: `border-border-subtle` → `border-border-default` for consistency

### Meta footer
- Reduce padding: `py-3` → `py-2.5`
- Keep as-is otherwise (already subtle)

### Card container
- Border: unified `border-border-default` (already correct)
- Shadow: keep current `shadow-[0_1px_3px_rgba(15,23,42,0.04)]` (very subtle)
- Radius: keep `rounded-2xl`

---

## 2. `comparison-header.tsx` — Lower action cards

### Both cards
- Unify border: both use `border border-border-default` (remove `border-dashed` from card 2)
- Both use `bg-white` instead of `bg-surface-secondary` for consistency with hero card
- Reduce padding: `p-4` → `p-3.5`
- Icon containers: reduce from `size-10 rounded-xl` → `size-9 rounded-lg` (subtler)
- `gap-3 mt-3` → `gap-3 mt-2` (tighter connection to hero card)

### Card 2 (roadmap)
- Fix `text-[11px]` → `text-xs` (12px minimum rule)

### CTA pill in card 1
- Keep dark primary styling but reduce padding slightly for balance

---

## 3. `report-shell-v2.tsx` — Hero section wrapper

- `pb-4` → `pb-3` on the ComparisonHeader wrapper (tighter fold)
- No other changes needed (wrapper is already clean `bg-surface-base`)

---

## Risks
- Minimal: pure CSS class changes, no data/logic affected
- Avatar ring simplification needs careful JSX restructure (two wrapper divs → one)
- `text-[11px]` fix in comparison-header addresses existing minimum-size violation

## Responsive
- All changes use existing responsive breakpoints (`sm:`, `md:`)
- Mobile-first approach preserved
- KPI strip remains 3-col grid at all sizes
