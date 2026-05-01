
# Engagement Benchmark Hero Chart Refinement

## Summary

Make the engagement chart larger, more interactive, less text-heavy. Move explanatory text to tooltip. Replace source links with [1] [2] [3]. Remove duplicate red warning. Add context line with unified badge.

## Changes

### 1. `report-engagement-benchmark-chart.tsx` — main refinements

**Chart size**: Increase `VB_H` from 280 to 340. Remove `maxHeight: 300px` inline style so the chart breathes. Increase `PAD_B` slightly for x-axis labels.

**Methodology paragraph → removed**: Delete the italic `<p>` at line 393–395 (methodology note). This text will live in the info tooltip added to the parent card title.

**Source context line**: After the [1] [2] [3] references, add:
```
◈ MERCADO · Instagram · contas 5–10K · referência por dimensão e formato
```
Using the `ReportSourceLabel type="mercado"` inline, plus `·`-separated context segments derived from the active tier label. Subtle, 10px, low opacity.

**Interactive hover refinements**:
- When a bar is hovered, dim all non-hovered bars (opacity 0.3 instead of 0.55).
- Tooltip content for non-active tiers: "Referência de mercado para contas {tierLabel}".
- Tooltip content for active tier: "Este é o teu escalão. A referência é {benchmark}%; o perfil está em {profile}%."
- Already implemented but will polish wording.

**Reduce duplicate warning**: The gap pill at the top of the chart already communicates the delta. The `PremiumCard` bottom interpretation badge is the duplicate. This will be handled in the parent.

**PRO slot**: Already present and subdued. No changes needed except ensuring `cursor-default` when no handler.

### 2. `report-overview-cards.tsx` — EngagementRateCard changes

**Info tooltip on title**: Add a small `Info` icon (from lucide-react) next to "Taxa de envolvimento" in the card header. On hover/focus, show the methodology text:
> "A taxa de envolvimento compara gostos e comentários com a dimensão da audiência. É uma referência direcional e pode variar por setor, dimensão da conta e método de cálculo."

Implementation: a `<span>` with `tabIndex={0}`, the `Info` icon, and a CSS-positioned tooltip that appears on `:hover` and `:focus-within`. No new dependencies.

**Remove bottom interpretation badge for engagement card**: Pass `interpretation={null}` to `PremiumCard` for the engagement card. The gap pill inside the chart already communicates the status — no need for a second red badge at the bottom.

**Pass active tier label to chart**: Pass follower tier label as a new optional prop so the context line can say "contas 5–10K" dynamically.

### 3. `report-benchmark-evidence.tsx` — no changes

This component is unused (zero imports). Leave it untouched.

### 4. No other files touched

- No locked files edited
- No Supabase/admin/provider/PDF/auth changes
- No benchmark values changed
- No calculation logic changed
- No new dependencies

## Visual result

- Chart is taller and more dominant
- Explanatory paragraph gone from card body → lives in `ℹ` tooltip
- Source links show only `[1] [2] [3]` (already the case, confirmed)
- Context line: `◈ MERCADO · Instagram · contas 5–10K · referência por dimensão e formato`
- Only one gap indicator (the chart's pill), no bottom red badge
- Hover dims non-active bars more, tooltip copy is more explicit
- Mobile: chart fills width, tooltip clamped, PRO slot stacks

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run`
