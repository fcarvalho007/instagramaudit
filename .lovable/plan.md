
# Audit: "Atualizar agora" Refresh Flow

## Results

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | `refresh-profile` does not change global execution mode | **PASS** | No `setMode`, `setExecutionMode`, or `execution_mode` references in file. Zero imports from execution-mode modules. |
| 2 | Public `/analyze/:username` remains cache-only | **PASS** | `analyze-public-v1` L437-482: when `forceRefresh` is false, the execution mode guard applies. `cache_only` blocks all provider paths. |
| 3 | `refresh=1` bypasses cache-only only with valid internal token | **PASS** | L387-398: `forceRefresh` is set to true only when `Authorization: Bearer $INTERNAL_API_TOKEN` matches. Otherwise the param is silently ignored. |
| 4 | Missing/expired cache shows pt-PT empty state | **PASS** | `CACHE_ONLY_NO_DATA` error code returned at L480. `analysis-error-state.tsx` renders pt-PT copy ("Este relatorio ainda nao tem dados...") with "Voltar ao inicio" CTA. |
| 5 | Provider calls impossible from public unauthenticated requests | **PASS** | Three independent gates: (a) `forceRefresh` token check, (b) execution mode guard, (c) allowlist gate. All must be passed to reach providers. |
| 6 | Concurrent admin refreshes for same handle blocked | **PASS** | `refreshingHandles` Set at L35. Checked at L144, returns 409 with `preflight_blocked: "concurrent_refresh"`. Released in `finally` at L72. |
| 7 | `INTERNAL_API_TOKEN` required | **PASS** | Pre-flight check at L116-123 returns 409 with `preflight_blocked: "internal_token_missing"` if absent. |
| 8 | APIFY/provider kill switches respected | **PASS** | `isApifyEnabled()` checked at L126. `isTestingModeActive()` + `isAllowed()` checked at L135. All return 409 before any analysis runs. |
| 9 | `COMMENT_SCRAPER_ENABLED=false` | **PASS** | L828 of `analyze-public-v1.ts`: defaults to `"false"`, requires explicit `"true"` to activate. |
| 10 | No PDF pipeline involved | **PASS** | Zero references to PDF, pdfshift, or generate-report-pdf in either file. |

## Summary

The refresh flow is correctly hardened. No code changes required.
