
# Block 1 Engagement Card — Visual Refinement

Pure CSS/class changes. Zero text, metric, calculation, or data source modifications.

## Files to edit (2)

### 1. `src/components/report-redesign/v2/report-overview-engagement.tsx`

**Card header (lines 39–57)**
- Title `text-sm` → `text-lg sm:text-xl` + keep `font-display font-semibold tracking-tight`
- Icon container: subtle size bump `size-9 rounded-xl`

**Hero metric strip (lines 61–139)**
- Container: `bg-surface-muted/50` → `bg-gradient-to-r from-surface-secondary via-tint-primary/30 to-surface-secondary`
- Border: `border-border-subtle` → `border-accent-primary/15`
- Main profile value (col 1): `text-2xl sm:text-[2rem]` → `text-[1.75rem] sm:text-[2.25rem]`
- Benchmark value (col 2): `text-xl sm:text-[1.75rem]` → `text-[1.5rem] sm:text-[2rem]`

### 2. `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx`

**Active tier row (line 108–113)**
- Background: `bg-tint-primary` stays
- Border: `border-2 border-accent-primary/30` → `border border-accent-primary/25` (lighter, less heavy)

**Active tier bar — premium gradient (lines 149–167)**
- Segment 1 (benchmark portion): `bg-accent-primary` → `bg-gradient-to-r from-accent-primary via-[#06B6D4] to-signal-success`
- Segment 2 (gap above benchmark): `bg-signal-success/80` → `bg-signal-success/70` (softer)

**Inactive tier bars (line 190)**
- `bg-content-secondary/12` → `bg-content-secondary/8` (softer, more elegant)

**Benchmark dashed line (line 91)**
- `border-content-secondary/25` → `border-content-secondary/20` (subtler)

**Legend (lines 210–250)**
- Add `border-t border-border-subtle pt-3` to the legend wrapper for separation

## Not touched

- All text/copy stays identical
- All metrics, calculations, formatters unchanged
- `score-utils.ts`, `score-card.tsx`, `score-grid.tsx`, `diagnostic-summary.tsx` — not touched
- Block 2, admin, PDF, auth, backend, adapters, loading, global tokens, locked files — not touched
