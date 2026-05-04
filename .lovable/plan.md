
# Polish "Taxa de envolvimento" — Block 1

## Problems identified (from screenshot)

1. **Profile marker collision**: When the profile value (0.08%) is far below the benchmark (4.80%), the red marker sits at the very bottom of the chart. The "Este perfil" and "0,08%" labels overlap with the active bar and x-axis labels.
2. **Aggressive marker glow**: The red glow on the profile marker is heavy — not consistent with the clean Iconosquare style.
3. **SVG hardcoded hex colors**: Y-axis labels, grid lines, bar value labels, reference line, profile marker, and competitor marker all use hardcoded hex values instead of CSS variables from the token system.
4. **Tooltip ring**: Still uses `ring-slate-200/80` instead of a semantic token.
5. **Legend dot**: `bg-rose-500` for "Este perfil" should use `bg-signal-danger`.

## Changes (single file)

**`src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx`**

### Fix 1 — Bottom zone label flip
- Add `BOTTOM_ZONE_THRESHOLD = 0.82` constant
- Detect when profile marker is in the bottom 18% of the chart area
- When in bottom zone: flip "ESTE PERFIL" + value labels **above** the marker instead of to the right
- When in bottom zone: force `labelFlipRight = true` to place labels on the left side of the bar, preventing overlap

### Fix 2 — Soften marker glow
- Reduce `markerGlow` filter: `stdDeviation` 3 → 2, `floodOpacity` 0.35 → 0.18
- Use `#A32D2D` (signal-danger token) instead of `#E11D48` for the glow flood color
- Reduce marker outer ring: `strokeWidth` 1 → 0.8, `opacity` 0.15 → 0.10
- Increase marker white stroke: 2 → 2.5 for cleaner cut

### Fix 3 — Soften active bar glow
- Reduce `activeBarGlow`: `stdDeviation` 4 → 3, `floodOpacity` 0.2 → 0.12
- Update inactive bar gradient to lighter neutrals (`#E8EDF4` → `#D4DBE8`)

### Fix 4 — Migrate SVG fills to CSS variables
- Y-axis labels: `#94a3b8` → `rgb(var(--text-tertiary))`
- Grid lines: `#e2e8f0` → `rgb(var(--border-default) / 0.10)`
- Reference dashed line + label: `#3B82F6` → `rgb(var(--accent-primary))`
- Bar value labels: `#1D4ED8` / `#94a3b8` → `rgb(var(--accent-primary))` / `rgb(var(--text-tertiary))`
- X-axis labels: `#1E293B` / `#94a3b8` → `rgb(var(--text-primary))` / `rgb(var(--text-tertiary))`
- Active underline: `#3B82F6` → `rgb(var(--accent-primary))`
- Profile marker: `#E11D48` → `rgb(var(--signal-danger))`
- Competitor marker: `#BA7517` → `rgb(var(--signal-warning))`
- Note: SVG gradient `<stop>` elements keep hex values (CSS variables don't work reliably in `stopColor`)

### Fix 5 — Minor polish
- "Este perfil" label → "ESTE PERFIL" (uppercase, smaller, tracked — matches eyebrow convention)
- Tooltip ring: `ring-slate-200/80` → `ring-border-default`
- Legend: `bg-rose-500` → `bg-signal-danger`

## Files changed
- `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx` (only file)

## Validation
- `bunx tsc --noEmit`
- `bunx vitest run`
- Visual QA via preview (auth required — user-side)
