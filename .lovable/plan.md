
## File to edit

`src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx` (not locked)

## Changes

### 1. Mobile tooltip overflow fix (lines 464, 475)

- Tighten the clamp from `Math.max(18, Math.min(82, pctX))` to `Math.max(28, Math.min(72, pctX))`.
- Add responsive max-width: change `max-w-[220px]` to `max-w-[180px] sm:max-w-[220px]`.

### 2. Near-zero profile marker guard (line 86)

Replace the raw `profileMarkerY` assignment:

```ts
const profileMarkerY = Math.max(
  PAD_T + MARKER_R,
  Math.min(yForVal(profileVal), PAD_T + innerH - MARKER_R - 2)
);
```

This clamps the marker so the circle and label never bleed into the X-axis zone or above the chart.

### 3. Reference line label repositioned (lines 180-189)

Move label from right-aligned (`x={VB_W - PAD_R - 2}`, `textAnchor="end"`) to left-aligned near the Y-axis:

```
x={PAD_L + 4}
textAnchor="start"
```

Everything else (the dashed line, colour, opacity, font) stays identical.

## What does NOT change

- Benchmark values, calculation logic, gap formula
- Active tier highlighting, profile marker colour, gap pill copy
- Source references as [1] [2] [3] with aria-labels
- Pro competitor slot
- Desktop hover behaviour and keyboard accessibility
- No other files touched
