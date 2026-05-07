
# Module Visibility Manager — QA Audit

## PASS/FAIL Table

| # | Check | Result | Detail |
|---|-------|--------|--------|
| 1 | `/analyze/$username` loads published overrides | **FAIL** | No call to `getPublishedFeatures`. No import of override functions. |
| 2 | `/analyze/$username` passes `featuresOverride` to `ReportShellV2` | **FAIL** | `AnalyzeReady` does not pass `featuresOverride` prop (lines 266-279). |
| 3 | `public_mvp` uses only published overrides, never draft | **N/A** | Public route uses neither — static defaults only. |
| 4 | `/admin/report-preview/$username?draft=true` uses draft overrides | **PASS** | Calls `getDraftFeatures()` when `draft=true` (line 119). |
| 5 | `/admin/report-preview/$username` (no draft) uses published overrides | **PASS** | Calls `getPublishedFeatures()` when `draft=false` (line 120). |
| 6 | `ReportShellV2` propagates `featuresOverride` via `VariantFeaturesOverrideProvider` | **PASS** | Line 98: `<VariantFeaturesOverrideProvider value={featuresOverride ?? null}>` |
| 7 | `useVariantFeatures()` returns overridden features when provided | **PASS** | Checks override context first, falls back to static (report-variant.ts lines 104-108). |
| 8 | Locked modules override draft/published changes | **PASS** | `getEffectiveFeatures()` applies `LOCKED_MODULES` after merge (effective-features.ts lines 73-78). |
| 9 | Publish action writes correct published row | **PASS** | `publishDraft()` reads draft, upserts with `is_draft: false`, deletes draft row. |
| 10 | Reset deletes correct rows and falls back to static | **PASS** | `resetToDefaults()` deletes all rows for variant. `getPublishedFeatures` catches errors and returns static defaults. |

## Summary Answers

- **Public route wired to published overrides:** NO
- **Draft preview wired:** YES
- **Published preview wired:** YES

## Files Checked

- `src/routes/analyze.$username.tsx` — public route
- `src/routes/admin.report-preview.$username.tsx` — admin preview
- `src/components/report-redesign/v2/report-shell-v2.tsx` — shell component
- `src/lib/report/report-variant.ts` — static defaults + context
- `src/lib/report/effective-features.ts` — lock rules + merge
- `src/lib/report/variant-overrides.server.ts` — DB CRUD
- `src/server/admin/variant-overrides.functions.ts` — server functions

## Missing Implementation

One gap: `/analyze/$username` → `AnalyzeReady` renders `ReportShellV2` with `variant="public_mvp"` and no `featuresOverride`. Published overrides in the DB have zero effect on the public report.

## Recommended Next Implementation Prompt

> Wire the public route `/analyze/$username` to consume published overrides.
>
> In `AnalyzeReady`, call `getPublishedFeatures({ data: { variant: "public_mvp" } })` and pass the result as `featuresOverride` to `ReportShellV2`. Use a try/catch so any DB failure silently falls back to static defaults (no user-visible error, no loading delay).
>
> Constraints: do not trigger analyses, do not call providers, do not touch admin/cost/PDF logic, do not change report design.
>
> Files to edit: `src/routes/analyze.$username.tsx` only.
