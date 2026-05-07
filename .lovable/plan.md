
# Provider Call Path Audit — Final Results

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Public users cannot trigger providers | **PASS** | `analyze-public-v1` L437: `if (!forceRefresh)` enforces `cache_only` guard. `forceRefresh` requires valid `INTERNAL_API_TOKEN` (L387-398). Additional gates: allowlist (L488-506), APIFY_ENABLED kill-switch (L522-558). |
| 2 | Admin refresh uses internal token | **PASS** | `refresh-profile` L54: `Authorization: Bearer ${internalToken}`. Pre-flight at L116-123. No global mode mutation. |
| 3 | Admin beta report uses internal token | **PASS** | `generate-beta-report` L135: `Authorization: Bearer ${internalToken}`. Pre-flight at L78-86. No execution mode check. |
| 4 | Global Fresh mode no longer required | **PASS** | Neither `refresh-profile` nor `generate-beta-report` import or check `getAnalysisExecutionMode`. Both use `?refresh=1` + internal token to bypass `cache_only` inside `analyze-public-v1`. |
| 5 | `cache_only` is the safe steady-state | **PASS** | Global mode defaults to `cache_only`. Public requests obey it. Admin requests bypass via authenticated `forceRefresh` only. |
| 6 | Provider kill switches respected | **PASS** | `APIFY_ENABLED` checked in `refresh-profile` (L126), `generate-beta-report` (L88-94), and `analyze-public-v1` (L522). `DATAFORSEO_ENABLED` gated in its own allowlist module. |
| 7 | `COMMENT_SCRAPER_ENABLED=false` | **PASS** | `analyze-public-v1` L828: defaults to `"false"`, requires explicit `"true"`. |
| 8 | Missing `INTERNAL_API_TOKEN` fails safely | **PASS** | `refresh-profile` returns 409 `internal_token_missing` (L117-123). `generate-beta-report` returns 409 `internal_token_missing` (L80-86). `analyze-public-v1` silently ignores `?refresh=1` (L394-397), falls through to `cache_only` guard. |
| 9 | Failed provider calls don't overwrite cached snapshots | **PASS** | `analyze-public-v1` only upserts snapshot on success. `generate-beta-report` marks report_request as `failed` with error metadata on failure (L159-170, L227-238) — does not touch `analysis_snapshots`. |
| 10 | No other routes trigger providers | **PASS** | `force-refresh` only expires snapshots (DB update, no provider call). `generate-report-pdf`, `request-full-report`, `send-report-email` operate on existing snapshots/PDFs. No other route calls `analyze-public-v1` or provider adapters directly. |

## Summary

All provider call paths are properly gated. The system is safe with `cache_only` as steady-state. No code changes needed.
