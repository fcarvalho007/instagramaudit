
# Refactor: Engagement Rate → Cinematic Benchmark Hero Chart

## Scope

Rewrite `report-engagement-benchmark-chart.tsx` to become the main visual figure of Block 01. Update `report-overview-cards.tsx` to remove brand names from visible source references. Keep the card shell (`PremiumCard`) and the other two overview cards untouched.

## Current state

- SVG-based custom bar chart already exists, ~350 lines
- Props already receive benchmark series, active tier, profile rate, competitor, source refs
- Chart height is already 260 viewBox / 300px max — close to target
- Brand names (Socialinsider, Buffer) visible in source footer AND in `ReportBenchmarkEvidence`
- No hover tooltips exist
- Profile marker is a thin red bar inside the active tier — easily missed
- Recharts is installed but not used in this chart (custom SVG)

## What changes

### 1. Chart component rewrite (`report-engagement-benchmark-chart.tsx`)

**Keep**: SVG-based approach (no Recharts — the custom SVG is more controllable for this specific chart). Keep all existing props.

**Visual upgrades**:
- Increase `VB_H` to 280 for more vertical impact
- Make the profile marker more prominent: change from thin sub-bar to a visible **pill/dot marker** with a horizontal indicator line, positioned on the active tier column — clearly distinguishable from the benchmark bar
- Add a **profile label** "Este perfil" next to the marker with the value
- Keep the dashed reference line for the benchmark value

**Interactive tooltips** (CSS-only, no framer-motion):
- Wrap each bar in an SVG `<g>` with `tabIndex={0}` and `role="button"`
- On hover/focus, show a floating HTML tooltip (positioned with absolute CSS, not SVG foreignObject) using React state (`hoveredIndex`)
- Tooltip content per spec:
  - Tier label, benchmark rate
  - For active tier: profile value, gap, context explanation
  - For non-active tiers: context-only message
  - Competitor data when available

**Source references** — remove brand names from visible UI:
- Replace `{ref.name} [n]` with just `[n]` as clickable links
- Keep `aria-label` with full name for accessibility
- Format: `Referências de mercado: [1] [2] [3]`

**Pro slot** — make quieter:
- Reduce visual weight: smaller icon, lighter ring, no background hover transition
- Keep the copy and PRO badge

### 2. Engagement card in `report-overview-cards.tsx`

- Remove `<ReportBenchmarkEvidence>` call (brand names live there). The chart's own footer replaces it.
- Keep the methodology note (`engagementExplanation`)
- Keep the `sourceSlot` (calculation badge)
- Keep the gap pill (now inside the chart component)

### 3. `report-benchmark-evidence.tsx`

- No changes to the component itself (still used elsewhere potentially)
- Just stop calling it from the engagement card

## Files to edit

| File | Changes |
|------|---------|
| `report-engagement-benchmark-chart.tsx` | Full rewrite: prominent profile marker, hover tooltips, source links as [1][2][3], quieter Pro slot |
| `report-overview-cards.tsx` | Remove `ReportBenchmarkEvidence` import and call from `EngagementRateCard` |

## Files NOT touched

- `block-config.ts`, `report-overview-block.tsx`, `report-diagnostic-*`, `tokens.css`, locked files, Supabase, OpenAI, PDF, admin, providers, caption intelligence

## Accessibility

- Bars keyboard focusable via `tabIndex={0}` on interactive `<g>` elements
- Each bar has `aria-label` with tier + benchmark value
- Tooltip visible on keyboard focus
- Source links [1][2][3] have `aria-label="Fonte: {name}"`
- Gap pill has descriptive text

## Mobile (375px)

- SVG uses `viewBox` + `w-full` — scales naturally
- Tooltip positioned to avoid overflow (clamped to chart bounds)
- Pro slot stacks vertically without horizontal overflow
- No horizontal scrolling

## Design tokens

- Active bar: `#2563D9` (existing accent-primary blue)
- Profile marker: `#E11D48` (existing rose/red for profile)
- Inactive bars: `#CBD5E1` (existing muted slate)
- Competitor: `#BA7517` (existing gold — only in Pro context)
- All match current token system
