
## Functional QA — Admin Execution Mode (Cache-only vs Fresh)

### Code Audit Summary

The execution mode feature is **fully implemented** at the code level:

| Component | Status | Details |
|-----------|--------|---------|
| `execution-mode.server.ts` | OK | `getAnalysisExecutionMode()`, `assertFreshModeAllowed()`, `CacheOnlyBlockedError` |
| `execution-mode.functions.ts` | OK | Server fns: get/set mode, expire snapshot, test profile statuses |
| `analyze-public-v1.ts` L604-649 | OK | Cache-only guard blocks fresh API calls; logs `blocked_cache_only` with `estimated_cost_usd=0` |
| `execution-mode-card.tsx` | OK | Segmented control with confirmation dialog for Fresh toggle |
| `admin.tsx` L90-122 | OK | Persistent `ExecutionModeBadge` in header |
| `test-profiles-card.tsx` L101 | OK | "Fresh" button `disabled={isCacheOnly}` |
| `cache-maintenance-card.tsx` L55 | OK | "Invalida o snapshot — não chama APIs" — only updates `expires_at` |
| `admin.sistema.tsx` | OK | Renders `ExecutionModeCard` |

**Current DB state:** `analysis_execution_mode = cache_only`

### One potential gap found

`assertFreshModeAllowed()` exists in `execution-mode.server.ts` but is **never called** anywhere. The cache-only guard works via the top-level check in `analyze-public-v1.ts` (L606-649), which blocks the entire flow early. This is actually correct — the guard at the API entry point is more reliable than per-provider guards. But `assertFreshModeAllowed` is dead code.

### QA Plan

All tests require **browser-based validation** against the live preview:

1. **Verify cache-only blocks fresh calls** — navigate to `/analyze/frederico.m.carvalho`, check DB for `blocked_cache_only` event, confirm no new `provider_call_logs`
2. **Verify cache-only with no snapshot** — request a handle with no snapshot, confirm `CACHE_ONLY_NO_DATA` response
3. **Verify admin UI** — check badge, Sistema page, button states
4. **Verify fresh mode** — toggle to fresh, expire cache, trigger analysis, confirm provider calls are created
5. **Clean up** — restore `cache_only` mode after testing

### Files that may change

- None expected — the feature looks correctly implemented
- If issues found, only execution-mode related files will be touched

### What will NOT be changed

- Public report cards (P01-P07)
- PDF, auth, global tokens
- Any non-execution-mode files
