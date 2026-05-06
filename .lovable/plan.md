
# Tighten Cache-Only Guard Order

## Problem

In `src/routes/api/analyze-public-v1.ts`, the execution order is:

```text
BEFORE:
1. Parse input
2. Dedup competitors
3. Allowlist gate ← creates analysis_events with blocked_allowlist
4. Cache lookup
5. cache_only guard ← too late
6. Apify kill-switch
7. Provider calls
```

A non-allowlisted handle in cache_only mode hits the allowlist block (step 3) before the cache_only guard (step 5), creating an `analysis_events` row with `outcome=blocked_allowlist`. This pollutes the audit trail — cache_only should never reach allowlist logic.

## Fix

Restructure the order to:

```text
AFTER:
1. Parse input
2. Dedup competitors
3. Cache lookup (moved up)
4. cache_only guard (moved up, right after cache lookup)
5. Allowlist gate (unchanged, only reached in fresh mode)
6. Apify kill-switch
7. Provider calls
```

The cache lookup doesn't depend on the allowlist — it only needs `cacheKey`. Moving it before the allowlist check means cache_only can short-circuit immediately.

## Changes

**File: `src/routes/api/analyze-public-v1.ts`**

1. Move the `cacheKey` computation, benchmark loading, and cache lookup block (L555-602) to just after competitor dedup (after L519).
2. Move the cache_only guard block (L604-649) to immediately follow the cache lookup.
3. Leave the allowlist gate, Apify kill-switch, and all fresh-mode logic untouched in sequence after the cache_only guard.
4. The `forceRefresh` logic (L555-573) stays between cache lookup and allowlist since it's only relevant for fresh mode — but it must move together with cache lookup since `isFresh(existing)` references `forceRefresh`.

Concretely the new order after competitor dedup will be:

```
cacheKey = buildCacheKey(...)
benchmarkData = await loadBenchmarkReferences()
existing = await lookupSnapshot(cacheKey)
forceRefresh logic
if (existing && !forceRefresh && isFresh(existing)) → serve cache
executionMode = await getAnalysisExecutionMode()
if (executionMode === "cache_only") → serve stale or CACHE_ONLY_NO_DATA
// --- only fresh mode reaches here ---
allowlist gate
apify kill-switch
provider calls...
```

No other files need changes. No UI changes. Fresh mode behaviour is identical.

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run`
- Confirm no `blocked_allowlist` events can occur during cache_only mode by code inspection
