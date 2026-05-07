
# QA Audit — Report Lab & Report Variant System

## PASS/FAIL Table

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | `/admin/report-lab` is admin-only | **PASS** | Route is `admin.report-lab.tsx` — child of `/admin` layout (`admin.tsx`), which wraps all children in `AdminAuthShell` (email allowlist gate). No public path exposes this component. |
| 2 | Report Lab switcher changes only local state | **PASS** | `useState<ReportVariant>("internal_lab")` at line 123 of `admin.report-lab.tsx`. The selected variant is passed as a prop to `ReportShellV2`; no global store, no URL param, no context mutation. |
| 3 | Switching variants does not affect public route | **PASS** | Public route hardcodes `variant="public_mvp"` (line 271 of `analyze.$username.tsx`). Report Lab uses its own local state. `ReportVariantProvider` is scoped inside each `ReportShellV2` instance (lines 92-274 of `report-shell-v2.tsx`). |
| 4 | `/analyze/$username` fixed to `public_mvp` | **PASS** | Line 271: `variant="public_mvp"` — hardcoded string literal, no conditional. |
| 5 | `/admin/report-preview/$username` fixed to `internal_lab` | **PASS** | Line 201: `variant="internal_lab"`. |
| 6 | `/admin/report-preview/snapshot/$snapshotId` fixed to `internal_lab` | **PASS** | Line 223: `variant="internal_lab"`. |
| 7 | Public report never shows admin/debug UI | **PASS** | No references to Report Lab, variant switcher, module visibility table, or admin controls exist in `analyze.$username.tsx` or any report-redesign component. `debugLabels` feature is `"hidden"` for `public_mvp` (in `report-variant.ts`), gating all debug labels in `caption-diagnostics-card.tsx`, `visual-cover-analysis-card.tsx`, and `report-comment-intelligence.tsx`. |
| 8 | `public_mvp` hides detailed comment intelligence | **PASS** | `commentIntelligence` is `"hidden"` for `public_mvp`. When unavailable, `CommentIntelligenceUnavailable` checks `features.debugLabels === "hidden"` (line 287-291) and renders the Pro teaser instead of technical details. |
| 9 | `internal_lab` shows full comment intelligence | **PASS** | `commentIntelligence` is `"full"` for `internal_lab`. `debugLabels` is `"full"`, so the component renders full technical detail (lines 310-340). |
| 10 | No provider calls during QA | **PASS** | This audit was read-only code inspection. No browser navigation, no API calls, no snapshot fetches. Network requests in context are pre-existing admin expense queries unrelated to this audit. |

## Issues Found

None.

## Recommended Next Implementation Prompt

The variant system and Report Lab are solid. Suggested next step:

> **Full public_mvp string audit** — Open the public report in Report Lab with `public_mvp` selected and visually scan every section for any remaining technical/internal strings (e.g. "enrichment", "em desenvolvimento", "payload", raw JSON labels, English fallback copy). This requires navigating the browser to `/admin/report-lab`, selecting Public MVP, and inspecting the rendered output for a real cached profile.
