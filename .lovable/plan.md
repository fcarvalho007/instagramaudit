
## Engagement Benchmark Card — Refinements

The current implementation already matches ~90% of the mockup. This plan addresses the remaining gaps.

### Files to modify

1. `src/components/report-redesign/v2/report-overview-engagement.tsx`
2. `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx`

### Changes

#### 1. Remove invented year from source label

**Current:** `SOCIALINSIDER 2025` (hardcoded — no year exists in the benchmark data)
**Fix:** Show only `SOCIALINSIDER` (or dynamically pull from source name). No year unless the data provides one.

#### 2. Benchmark reference line label placement

**Current:** The benchmark label (`benchmark X,XX%`) is in the chart header row, left-aligned.
**Mockup:** The label sits directly above the dashed reference line, positioned at the same horizontal offset as the line itself.
**Fix:** Move the benchmark label from the header into the bar chart area, positioned absolutely above the dashed line at `left: benchmarkPct%`. Small font, content-secondary.

#### 3. "✦ MERCADO" pill character

**Current:** Uses `◆` (black diamond).
**Mockup/spec:** Uses `✦` (four-pointed star).
**Fix:** Replace `◆` with `✦`.

#### 4. Active tier bar — benchmark vs profile segments

**Current:** The active tier bar shows only the profile overlay with gradient.
**Mockup:** Shows the benchmark portion as solid blue and then a green segment from benchmark to profile value, making the gap visually explicit.
**Fix:** On the active tier, render two segments: (a) solid accent-primary bar up to the benchmark value, (b) green (signal-success) segment from benchmark to profile value. If profile is below benchmark, show only the blue bar up to profile value.

#### 5. Inactive tier bar styling

**Current:** Uses `bg-surface-muted` — very subtle.
**Mockup:** Bars are slightly more visible, a light grey with some body.
**Fix:** Ensure inactive bars use a visible but muted fill. Might just be a minor opacity or shade tweak on `surface-muted`.

#### 6. Metric strip separators

**Current:** The three columns have no visual separator between them.
**Mockup:** Thin vertical lines between the three metric segments.
**Fix:** Add thin `border-r border-border-subtle` between columns 1-2 and 2-3 on desktop. On mobile (stacked), hide the vertical borders and optionally add horizontal separators.

#### 7. Metric strip background

**Current:** Column 1 has blue tint, column 2 has no background, column 3 has success/danger tint.
**Mockup:** All three segments sit within a single soft-bordered strip with uniform light background.
**Fix:** Wrap the three columns in a single container with `bg-surface-muted rounded-xl border border-border-subtle` and remove individual column backgrounds. Keep the tint only on column 3 for signal color.

### No changes needed

- Data source, adapter, backend — untouched
- Tier labels, sublabels, formatters — already correct
- Legend and sources row — already matches
- Axis label — already dynamic
- Accessibility (aria-labels, role="list") — already present
- PDF, admin, other blocks — untouched

### Validation

- `tsc` and `vitest`
- Visual QA at desktop and 375px
- Test: profile above/below benchmark, missing benchmark fallback
