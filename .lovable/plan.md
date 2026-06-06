# Formato Pouco variado — desktop refinement

## File to edit

- `src/components/report-redesign/v2/overview/format-card.tsx` (only this file)

`FormatBreakdown` (donut + legend) is already structured fine and stays as is. The problem is contained in the thumbnail grid block (lines 311–369) and its relationship to the breakdown above.

## What's wrong today

The thumbnail grid uses `grid-cols-3 sm:grid-cols-4 md:grid-cols-4` with `aspectRatio: 1/1`. On a wide desktop card the four columns balloon each thumb to ~170–200px, so the gallery dominates the section and pushes the donut summary out of focus.

## Plan

### 1. Cap thumb size with auto-fill on desktop

Swap the rigid `md:grid-cols-4` for an `auto-fill` track that caps cell size:

```
grid gap-2 grid-cols-3 sm:grid-cols-4
md:[grid-template-columns:repeat(auto-fill,minmax(84px,1fr))]
lg:[grid-template-columns:repeat(auto-fill,minmax(96px,1fr))]
```

Result: thumbnails stay ~84–110px square on desktop regardless of card width, while mobile keeps the existing 3–4 columns. No max-width hack needed; the grid fills naturally and wraps to additional rows if the card is very wide.

### 2. Reframe the gallery as supporting evidence

Wrap the eyebrow + grid + legend in a subtle sub-frame so it visually reads as secondary to the donut:

- `rounded-xl border border-border-default bg-surface-muted/40 px-4 py-4 md:px-5 md:py-5`
- Eyebrow stays `text-eyebrow-sm`, copy unchanged (`12 posts analisados`).
- Legend moves to the eyebrow row on desktop (`flex justify-between`), wraps below on mobile — same chips, no copy change.

### 3. Spacing rhythm

- Promote space between donut breakdown and the gallery sub-frame from `mt-5` → `mt-6`.
- Tighten the gap between the gallery and the "A melhorar" insight callout: keep `mt-auto` for vertical fill but ensure the callout has `mt-6` after the framed gallery so it reads connected, not floating.
- Reduce inter-thumb gap from `gap-2` → `gap-1.5` on desktop for a calmer rhythm; keep `gap-2` on mobile.

### 4. Thumb cell polish (minor)

- Border `border-border-subtle/40` → `border-border-default/60` for crisper edges at the smaller size.
- Format dot kept (`size-2.5`); already proportional.

### 5. Out of scope

- `FormatBreakdown` (donut + per-format legend rows) — no change.
- `ExternalReferenceTable`, `ExternalSourceNote`, verdict copy — no change.
- Data: `formats`, `postsAnalyzed`, `sortedPosts`, classification — no change.
- Other report sections, payment, unlock, report generation — no change.

## Deliverables

1. Files changed: only `format-card.tsx`.
2. Visual summary (thumb cap, framed gallery, legend repositioned, spacing).
3. Confirmation no data/scoring/payment/unlock logic touched.
4. Desktop + mobile visual checklist via preview.
