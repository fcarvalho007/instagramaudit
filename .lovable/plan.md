
# Apply two-font system to remaining public report components

## Status

The previous implementation cleaned `font-mono` from:
- `src/components/report-redesign/` (v2 report) — done
- `src/components/report-enriched/` — done
- `src/components/report-market-signals/` — done
- `src/components/product/` — done
- `src/components/landing/` — done

**Still remaining**: 15 `font-mono` instances in `src/components/report/` (v1 report components), which are public-facing.

No `Work Sans` or `Instrument Serif` found anywhere in the codebase.

## Files to fix (8 files, 15 replacements)

| File | Lines | Change |
|------|-------|--------|
| `report-top-posts.tsx` | 68, 72, 75 | `font-mono` → remove (inherit Inter) |
| `report-format-breakdown.tsx` | 113 | `font-mono` → `tabular-nums` |
| `report-competitors.tsx` | 86 | `font-mono` → remove |
| `report-chart-tooltip.tsx` | 45 | `font-mono` → `tabular-nums` |
| `report-benchmark-gauge.tsx` | 138 | `font-mono` → `tabular-nums` |
| `report-posting-heatmap.tsx` | 114 | `font-mono` → `tabular-nums` |
| `report-kpi-card.tsx` | 125, 141 | `font-mono` → `tabular-nums` |
| `report-hashtags-keywords.tsx` | 35, 39, 44, 79 | `font-mono` → `tabular-nums` |
| `report-ai-insights.tsx` | 46 | `font-mono` → `tabular-nums` |

All replacements: `font-mono` → `tabular-nums` (preserving existing weight/size classes). Inter is inherited from html root.

## Validation

1. `tsc --noEmit`
2. `vitest run`
3. Confirm zero `font-mono` in all public report paths
4. Visual QA on report preview

## Not touched

Provider logic, module visibility, data logic, PDF pipeline, Supabase schema.
