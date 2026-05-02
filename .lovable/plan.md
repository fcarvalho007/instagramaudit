
## What changes

Move `ReportTopPosts` (and its AI insight) from Block 04 "Conteúdo" to the end of Block 01 "Overview", so users immediately see their actual posts after the overview metrics.

### 1. `report-shell-v2.tsx`

- Remove `<ReportTopPosts />` and its `renderInsight("topPosts")` from Block 04
- Pass `renderInsight` through to `ReportOverviewBlock` (it already receives it but ignores it)

### 2. `report-overview-block.tsx`

- Import `ReportTopPosts` from `@/components/report/report-top-posts`
- Add it at the end of the overview block, after the 3 cards
- Include the `renderInsight("topPosts")` below it
- Keep the editorial hierarchy: cards first (seconds-level scan), then the Top 5 as proof that content was read

### Files changed
- `src/components/report-redesign/v2/report-shell-v2.tsx`
- `src/components/report-redesign/v2/report-overview-block.tsx`

No locked files touched. No data/calculation changes.
