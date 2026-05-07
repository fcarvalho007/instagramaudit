
# QA Audit — Report Variant Architecture + Comment Scraper Disabled

## PASS/FAIL Table

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | `COMMENT_SCRAPER_ENABLED` is false | **PASS** | Secret exists in runtime secrets. Code at `routes/api/analyze-public-v1.ts:822` and `lib/analysis/comment-scraper.server.ts:120` gate on `=== "true"` — anything other than literal `"true"` disables it. Previous session confirmed it was set to `"false"`. |
| 2 | `analysis_execution_mode` is `cache_only` | **N/A** | No such concept exists in the codebase. There is no execution mode flag. The system uses `APIFY_ENABLED` as the kill-switch. When `APIFY_ENABLED=true`, fresh analyses can run; the comment scraper is independently gated by `COMMENT_SCRAPER_ENABLED`. This check is not applicable. |
| 3 | `public_mvp` passed to public analyze route | **PASS** | `src/routes/analyze.$username.tsx:271` passes `variant="public_mvp"` to `ReportShellV2`. The shell default is also `"public_mvp"` (line 76). |
| 4 | `internal_lab` available for admin preview | **FAIL** | Both admin preview routes (`admin.report-preview.$username.tsx` and `admin.report-preview.snapshot.$snapshotId.tsx`) use the legacy `ReportPage` component, not `ReportShellV2`. The variant system is not wired into admin previews. Admin previews currently render the old shell, which does not suppress comment intelligence or apply variant visibility rules. |
| 5 | `public_mvp` hides detailed `comment_intelligence` even when cached | **PASS** | `report-diagnostic-block.tsx` reads `useVariantFeatures()` and sets `effectiveCommentIntel = null` when `features.commentIntelligence !== "full"`. For `public_mvp`, `commentIntelligence` is `"hidden"`, so cached data is suppressed. |
| 6 | Q05 still renders post-level audience metrics | **PASS** | `renderAudienceCard()` in `report-diagnostic-block.tsx` uses the `classifyAudienceResponse()` classifier which operates on post-level `avgLikes`, `avgComments`, `commentsToLikesPct`. This runs regardless of comment intelligence availability. The `DiagnosticAudienceHighlight` component receives `commentIntel: null` and falls back to post-level display. |
| 7 | No debug strings visible in `public_mvp` | **PASS** | Grep for `"payload"`, `"debug"`, `"em desenvolvimento"`, `"missing data"` in `src/components/report-redesign/` returned zero hits. The variant features define `debugLabels: "hidden"` for `public_mvp`, and the shell checks `features.betaFeedbackBanner` before rendering the beta banner. |
| 8 | Cached snapshots still render | **PASS** | DB confirms cached snapshots exist (e.g. `martimsilvai` with `comment_intelligence`, `frederico.m.carvalho` with `comment_intelligence`). The public route fetches from `analysis_snapshots` via `fetchPublicAnalysis()` and passes to `ReportShellV2`, which renders all blocks. The variant suppression only affects the comment intelligence display, not the overall render. |
| 9 | No providers called during this audit | **PASS** | This audit used only read-only tools: `fetch_secrets`, `code--view`, `code--exec` (grep), `supabase--read_query`. No API endpoints were hit, no analyses triggered. |

## Summary

**8 PASS, 1 FAIL, 1 N/A**

### Issue Found

**Admin preview routes do not use the variant system.** Both `/admin/report-preview/$username` and `/admin/report-preview/snapshot/$snapshotId` render `ReportPage` (the legacy report shell), not `ReportShellV2`. This means:

- Admin previews do not benefit from the variant architecture
- There is no way to preview `internal_lab` vs `public_mvp` from admin
- Comment intelligence in cached snapshots will still display in admin previews (via the legacy shell), which is acceptable for admin use but means there is no `internal_lab` variant toggle

### Note on `analysis_execution_mode`

The codebase has no execution mode toggle. Cost protection comes from three independent kill-switches: `APIFY_ENABLED`, `COMMENT_SCRAPER_ENABLED`, and `DATAFORSEO_ENABLED`. There is no single `cache_only` mode.

## Recommended Next Prompt

Wire `internal_lab` variant into admin preview routes by migrating them from `ReportPage` to `ReportShellV2` with `variant="internal_lab"`. This gives admin the full enriched view (including cached comment intelligence) while keeping the public route on `public_mvp`. Scope:

1. Update `admin.report-preview.$username.tsx` to use `ReportShellV2` with `variant="internal_lab"`
2. Update `admin.report-preview.snapshot.$snapshotId.tsx` similarly
3. Verify both routes still render correctly with existing cached snapshots
4. Keep the legacy `ReportPage` component intact for rollback
