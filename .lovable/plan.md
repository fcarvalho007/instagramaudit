
## Scope

Two files, UI-only. No logic, data, or provider changes.

1. `src/components/report-redesign/v2/report-overview-engagement.tsx`
2. `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx`

---

## 1. report-overview-engagement.tsx

### Header → metrics spacing
- Add a thin `border-t border-border-default` separator between header and KPI row (via `mt-0` on the KPI section and a `border-t` div)
- Increase spacing: header `pb-4 sm:pb-5`, KPI section `pt-5 sm:pt-6`

### KPI cards — balance widths and readability
- Change grid from `grid-cols-3` to `grid-cols-1 sm:grid-cols-3` so cards stack on mobile (no overflow)
- Numbers: `text-[1.4rem] sm:text-[2rem]` → `text-[1.6rem] sm:text-[2.25rem]` (larger, main focus)
- `%` suffix: same size bump to match
- Card padding: `px-3 py-4 sm:px-5 sm:py-5` → `px-4 py-4 sm:px-5 sm:py-5` (slightly more horizontal room)

### Soften KPI 3 accent
- Danger: `border-signal-danger/15 bg-signal-danger/4` → `border-signal-danger/12 bg-signal-danger/3`
- Success: `border-signal-success/15 bg-signal-success/4` → `border-signal-success/12 bg-signal-success/3`

### Status pill
- Reduce pill to `text-[10px]` from `text-xs` for subtlety

### Chart section spacing
- `mt-2` → `mt-4 sm:mt-6` — more breathing room between KPIs and chart

### Diagnostic reading
- `pb-5 sm:pb-6 md:pb-8` → `pb-6 sm:pb-7 md:pb-8` — slightly more bottom padding

---

## 2. report-engagement-benchmark-chart.tsx

### Chart rows — more vertical space
- Container `gap-2.5` → `gap-3` between tier rows
- Active row: `py-4 sm:py-5` → `py-5 sm:py-6`
- Inactive rows: `py-2.5 sm:py-3` → `py-3 sm:py-3.5`

### Soften active row colours further
- Border opacity: `0.18` → `0.14`
- Background opacity: `0.02` → `0.015`
- Bar opacity: `0.65` → `0.55` (softer, less aggressive)
- Reference zone: `0.06` → `0.04`

### Right-side percentage column
- Active row value: `text-[13px] sm:text-[14px]` → `text-[14px] sm:text-[15px]`
- Inactive value: same bump `text-[13px] sm:text-[14px]` → `text-[14px] sm:text-[15px]`
- Consistent `min-w-[60px] sm:min-w-[64px]`

### Chart labels — easier to scan
- Tier labels (inactive): `text-[13px]` → `text-[13px] sm:text-[14px]`
- Sub-labels: `text-xs` (keep) — already appropriate
- "← ESTÁS AQUI": `text-[10px]` → `text-[11px]`, `text-content-tertiary` → `text-content-secondary/60` (slightly more visible)

### X-axis
- `text-content-secondary/40` → `text-content-secondary/35` — subtler tick labels

### Sources strip
- Add `mt-1` for slight separation from x-axis
- `pt-1` → `pt-2` — align better with card grid

---

## Mobile safety

- KPI grid stacks to `grid-cols-1` on mobile → no horizontal overflow
- All `min-w-[]` values are small enough for 375px
- Chart bars use `flex-1` — adapts naturally

## Risks

Minimal — purely spacing, sizing and opacity adjustments.
