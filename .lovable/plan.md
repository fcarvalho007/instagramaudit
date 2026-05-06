
# Cache Warming — frederico.m.carvalho & martimsilvai

## Pre-check Summary

| | frederico.m.carvalho | martimsilvai |
|---|---|---|
| snapshot_id | `683e4c21` | `883cf964` |
| updated_at | 2026-05-06 16:21 | 2026-05-04 17:08 |
| expires_at | 2026-05-07 16:17 | 2027-01-01 |
| enrichment_status | Yes (all success) | No |
| market_signals_free | Yes | No |
| ai_insights_v1 | Yes | No |
| ai_insights_v2 | Yes | No |
| visual_cover | Yes | No |
| caption_semantic | Yes | No |
| _thumbnail_base64 | Yes (12) | No |

**frederico.m.carvalho** is already fully enriched from the latest run. A re-warm is optional — its snapshot expires tomorrow.

**martimsilvai** has a stale snapshot from May 4 with no enrichment layers. It needs a full fresh run + enrichment.

## Critical Finding: `cache_only` is NOT enforced

The `analysis_execution_mode` value exists in `app_config` but **no code reads it to block API calls**. The functions in `execution-mode.server.ts` (`getAnalysisExecutionMode`, `assertFreshModeAllowed`) are defined but never imported or called by the analyze endpoint or enrichment runner.

This means toggling `cache_only` provides zero protection. Any request hitting `/api/analyze-public-v1` with an expired snapshot will trigger a fresh Apify call regardless.

## Plan

### Step 1 — Wire execution mode enforcement (critical fix)

Add the `assertFreshModeAllowed` guard to the analyze endpoint at the point where it would make a fresh Apify call. This is a small surgical change:

- In `src/routes/api/analyze-public-v1.ts`, import `assertFreshModeAllowed` and call it before `runActorWithMetadata`
- On `CacheOnlyBlockedError`, return the stale/expired snapshot if available, or a clear error

This ensures `cache_only` actually works before we proceed.

### Step 2 — Switch to `fresh` mode

Update `app_config` to `fresh`.

### Step 3 — Warm frederico.m.carvalho

- Use admin force-refresh to expire the current snapshot
- Trigger a fresh analysis via the published analyze endpoint
- Wait for enrichment_jobs to complete (sweep or direct trigger)
- Verify all 5 enrichments succeed

### Step 4 — Warm martimsilvai

- Verify `martimsilvai` is on all three allowlists (APIFY_ALLOWLIST, OPENAI_ALLOWLIST, DATAFORSEO_ALLOWLIST). If not, this will be flagged before proceeding.
- Use admin force-refresh to expire the current snapshot
- Trigger a fresh analysis
- Wait for enrichment_jobs to complete
- Verify all 5 enrichments succeed

### Step 5 — Switch back to `cache_only`

Update `app_config` to `cache_only`. With Step 1 in place, this now actually blocks fresh API calls.

### Step 6 — Final validation

For each profile:
- Confirm payload completeness (13 keys)
- Confirm enrichment_status all success
- Provider cost breakdown with attribution
- Confirm cache serves without provider calls

## Output

- PASS/FAIL table per profile
- Cost breakdown per profile
- Mode confirmation
- Any issues found

## Technical Details

### Files modified
- `src/routes/api/analyze-public-v1.ts` — add execution mode guard (Step 1)

### No other changes
- No UI changes
- No new features
- No locked file modifications
