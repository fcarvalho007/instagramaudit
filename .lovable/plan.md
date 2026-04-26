# Real Report Data Provider — Refactor Plan

## Objective

Allow report section components to consume injected `ReportData` (from real snapshots) while preserving 100% of the current visual output and keeping `/report/example` driven by the existing mock as a fallback.

No layout, copy, styling, classes, charts, or section ordering changes. No edits to `report-mock-data.ts`, `/report/example`, PDF, or email flows. No Apify calls, no migrations.

## Files to create

### `src/components/report/report-data-context.tsx`

Pure React context module:

- Imports `reportData` and `type ReportData` from `./report-mock-data`.
- Creates `ReportDataContext` (default `null`).
- Exports `ReportDataProvider({ data, children })` that supplies `data` via the context.
- Exports `useReportData(): ReportData` — returns context value if a provider is present, otherwise returns the mock `reportData` singleton.

This guarantees backward compatibility: any component rendered without a provider keeps rendering the same mock data it does today.

## Files to edit

### `src/components/report/report-page.tsx`

- Add optional prop `data?: ReportData` (import the type from `./report-mock-data`).
- When `data` is provided, wrap the existing JSX tree in `<ReportDataProvider data={data}>…</ReportDataProvider>`.
- When `data` is omitted, render the same JSX as today (no provider needed — components fall back to the mock).
- Section order, spacing, and container untouched.

### Twelve report section components — identical mechanical change

Files:

- `report-header.tsx`
- `report-key-metrics.tsx`
- `report-temporal-chart.tsx`
- `report-benchmark-gauge.tsx`
- `report-format-breakdown.tsx`
- `report-competitors.tsx`
- `report-top-posts.tsx`
- `report-posting-heatmap.tsx`
- `report-best-days.tsx`
- `report-hashtags-keywords.tsx`
- `report-ai-insights.tsx`
- `report-footer.tsx`

For each file:

1. Replace `import { reportData } from "./report-mock-data";` with `import { useReportData } from "./report-data-context";`.
2. Inside the component body (top, before any usage), add `const reportData = useReportData();`.
3. Leave every other line — JSX, classNames, computations, helper calls, chart configuration — untouched.

The local variable name `reportData` is kept on purpose so all downstream references (`reportData.profile`, `reportData.keyMetrics`, `reportData.bestDays`, etc.) continue to work without any further edits.

## Locked-files note

The 12 report section components and `report-page.tsx` are listed in `LOCKED_FILES.md` / `mem://constraints/locked-files`. The user has explicitly authorised editing them for this data-source refactor only. The lock policy itself is not being changed.

## Validation

1. `bunx tsc --noEmit` passes.
2. `bun run build` passes.
3. `/report/example` continues to render with mock data via the hook fallback (no provider in that route).
4. No Apify calls made, no DB migrations created, no secrets touched.

## Out of scope (intentionally not touched)

- `src/routes/report.example.tsx`
- `src/components/report/report-mock-data.ts`
- `src/components/report/report-theme-wrapper.tsx`, `report-section.tsx`, `report-kpi-card.tsx`, `report-chart-tooltip.tsx` (no mock import; nothing to change)
- Admin preview route (will be added in a follow-up step that consumes the new provider)
- PDF renderer, email templates, Apify client, snapshot adapter
