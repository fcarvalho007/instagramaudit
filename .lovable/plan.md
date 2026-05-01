
## Audit Result

The unified source badge system (`ReportSourceLabel`) is already deployed across 6 V2 components. **No old labels** ("DADO EXTRAÍDO", "LEITURA AUTOMÁTICA", etc.) remain anywhere in the codebase.

### What already uses the unified system

| File | Badge(s) |
|------|----------|
| `report-diagnostic-card.tsx` | `ia`, dynamic `sourceType` |
| `report-diagnostic-verdict.tsx` | `ia` / `auto` |
| `report-diagnostic-priorities.tsx` | `ia` |
| `report-overview-cards.tsx` | `auto`, `dados` |
| `report-themes-feature.tsx` | `ia` |
| `report-caption-intelligence.tsx` | via `SourceBadge` wrapper (all 3 types) |

### Remaining fixes (3 items)

**1. Engagement chart: replace inline `◈ MERCADO` text with `ReportSourceLabel`**

Line 431 of `report-engagement-benchmark-chart.tsx` hardcodes `◈ MERCADO · Instagram...` as a raw string. Replace with `<ReportSourceLabel type="mercado" />` followed by the context text, for visual consistency.

**2. KPI grid: add source badges to KPI cards**

`report-kpi-grid-v2.tsx` renders 3 KPI cards (engagement, posting rhythm, dominant format) without any source badges. Add:
- Engagement card: `auto` badge (calculated from likes + comments)
- Posting rhythm card: `auto` badge (calculated from post dates)
- Dominant format card: `auto` badge (classification from post types)

Each badge placed in the card's top-right corner, matching the card layout convention.

**3. Delete legacy `ai-badge.tsx`**

`ai-badge.tsx` is imported by nothing. It uses a different visual style (blue pill with Bot icon) that conflicts with the unified family. Delete it.

### Files changed

- `src/components/report-redesign/v2/report-engagement-benchmark-chart.tsx` — replace inline badge text
- `src/components/report-redesign/v2/report-kpi-grid-v2.tsx` — add source badges
- `src/components/report-redesign/v2/ai-badge.tsx` — delete

### What does NOT change

- All diagnostic logic, benchmark values, calculations
- `report-source-label.tsx` (the unified badge component itself)
- `source-badge.tsx` (backward-compat wrapper)
- Any locked file
