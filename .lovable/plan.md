
## Scope

Only `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx`. No logic, data, or schema changes.

## Refinements

### 1. Competitor marker Y clamp (parity with profile marker)

The profile marker already has a near-zero clamp, but the competitor marker at line 327 uses raw `yForVal()` — it can bleed into the X-axis zone too. Apply the same clamp pattern.

### 2. Reference line label collision with profile marker

When the profile value is close to the benchmark value, the "Referência do escalão" label (at `refY - 5`) can collide with the profile marker's "Este perfil" label (at `my - 7`). Add a dynamic offset: if the two Y values are within ~18px, nudge the reference label above the collision zone.

### 3. Soften grid lines

Change grid line stroke from `#e2e8f0` / `0.5` to `#e2e8f0` / `0.35` for a more refined, less busy background.

### 4. Smoother bar hover transition

Add `transition-all duration-200` to bar rects instead of just `transition-opacity duration-150` for a more polished feel when hovering.

### 5. Active bar subtle glow

Add a faint drop shadow filter on the active bar to visually separate it from context bars — using an SVG `<filter>` with a soft blue shadow.

### 6. Profile marker label right-edge guard

When the active tier is the last bar, the "Este perfil" and rate labels positioned at `cx + MARKER_R + 5` can overflow the SVG viewBox right edge. Detect this case and flip the label to the left side of the marker.

## Files changed

- `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx`

## What does NOT change

- Benchmark values, calculation logic, gap formula
- Source references format
- Pro competitor slot
- Tooltip content and accessibility
