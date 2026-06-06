# Refine premium teaser cards with section-specific blurred skeletons

## Goal

Replace the generic 4-bar blurred preview inside `PremiumTeaserCard` with a section-specific skeleton that resembles the corresponding Pro section. No premium data, no AI, no provider calls.

## Files changed

1. **Edit** `src/components/report-redesign/v2/premium-teaser-card.tsx`
   - Add prop `previewVariant?: "frequency" | "format" | "publications" | "diagnostic" | "priorities"`. Default keeps current generic bars (back-compat).
   - Replace the inner blurred block (lines 116-137 region) with `<TeaserPreview variant={previewVariant} />` while keeping the absolutely-positioned CTA overlay unchanged.
   - Add five small, pure-presentational skeleton sub-components in the same file:
     - `FrequencyPreview` — three KPI tiles in a row, a 7-cell weekly rhythm strip (varying heights), a muted single-line "insight" bar. Mobile: KPIs stack to 3 small columns, strip stays full-width.
     - `FormatPreview` — horizontal proportion bar (3 segments), 4-thumb mini filmstrip with rounded rects, muted legend row.
     - `PublicationsPreview` — small SVG scatterplot (axes + ~8 dots) on the left; two compact best/worst card placeholders on the right (stack on mobile).
     - `DiagnosticPreview` — 2x2 grid of mini diagnostic-card skeletons (icon dot + 2 lines each). The visible 7-item list is already rendered above by `subItems`.
     - `PrioritiesPreview` — 3 stacked horizontal "priority" rows labelled visually as opportunity / risk / action (color-coded dot + 2 muted lines).
   - All skeletons use semantic tokens (`bg-surface-muted`, `bg-accent-primary/20`, `border-default`), `blur-[5px]`/`opacity-70`, are `aria-hidden`, and use only `<div>` / `<svg>` with no text. No invented numbers or labels appear.
   - Each preview is height-bounded (`h-[160px] md:h-[200px]`) and uses `overflow-hidden` so nothing escapes horizontally on mobile.
   - The white→muted fade overlay stays, ensuring the CTA pill remains readable on top.

2. **Edit** `src/components/report-redesign/v2/report-overview-block.tsx`
   - Extend `PREMIUM_TEASERS` entries with a `previewVariant` field and pass it through to `<PremiumTeaserCard />`. Mapping:
     - `03` → `"frequency"`
     - `04` → `"format"`
     - `05` → `"publications"`
     - `06` → `"diagnostic"` (the 7-item `subItems` list is already wired and stays)
     - `07` → `"priorities"`

No other files touched.

## Before / after teaser structure

Before — all five teasers share the same generic 4-bar blurred preview (`premium-teaser-card.tsx` lines 116-137).

After — each teaser keeps the same header (number chip, eyebrow, title, value prop, optional sub-items, Premium badge) and same CTA pill (`Desbloquear por {priceLabel}`), but the blurred area below the description becomes:

| # | Section | New skeleton structure (all blurred, aria-hidden) |
|---|---|---|
| 03 | Frequência editorial | 3 KPI tiles · weekly rhythm strip (7 cells) · muted insight line |
| 04 | Mix de formatos | proportion bar (3 segments) · 4-thumb filmstrip · 3-chip muted legend |
| 05 | Publicações-chave | scatterplot SVG · 2 best/worst card placeholders |
| 06 | Diagnóstico editorial | 7 visible question chips (unchanged) + 2×2 mini diagnostic-card grid below |
| 07 | Prioridades de acção | 3 stacked rows (opportunity / risk / action) with color-coded dots |

## Premium data confirmation

The new skeletons render only static decorative shapes from semantic tokens — no text labels other than the existing visible heading/description/sub-items, which the current teaser already shows. They do NOT read:
- `aiInsightsV2`, `commentIntelligence`
- `visual_cover_analysis`, `caption_semantic_analysis`
- `enriched.formatBreakdown` numbers, `topPosts`, `worstPosts`
- pricing / entitlement / credit state

The CTA pill keeps the dynamic price via `PUBLIC_PRODUCTS.report_full_9.priceLabel` and continues to call `usePremiumCta().handlePremiumAccessClick(source)`.

## Not changed

Pricing, checkout, EuPago, entitlements, credits, provider calls, snapshot generation, schema, Pro report content, Internal Lab, sticky unlock bar, free overview reading card.

## Desktop / mobile validation checklist

1. `/analyze/<free handle>` shows 5 teasers with five distinct skeletons matching the table above.
2. Each blurred preview is unreadable (no specific numbers, names, or text).
3. CTA "Desbloquear por 9€" still opens the existing unlock modal via `usePremiumCta`.
4. Price string is read from `PUBLIC_PRODUCTS.report_full_9.priceLabel` (verified by temporarily editing the product price — not part of this change).
5. `/analyze/<pro handle>` (premiumUnlocked) renders no teasers — Pro report unchanged.
6. `/admin/report-preview/<h>?variant=internal_lab` unchanged.
7. Mobile (≤375px): each teaser fits viewport, no horizontal scroll; skeleton sub-elements stack as designed.
8. No new network requests trigger when scrolling through teasers (no AI/DataForSEO).
