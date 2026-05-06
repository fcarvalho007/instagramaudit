
# Async Enrichment Pipeline — QA Results

## Key Finding

**The enrichment pipeline code has never executed in production.** The latest fresh analysis (May 6, 14:20 UTC for `frederico.m.carvalho`) produced no `enrichment_jobs` rows, and the snapshot has no `enrichment_status` field. The code changes exist in the codebase but the deployed build predates them.

## QA Checklist Results

| # | Check | Status | Detail |
|---|-------|--------|--------|
| 1 | Fresh base analysis returns without timeout | **CANNOT TEST** | System is in `cache_only` mode; no fresh run occurred with the new code deployed |
| 2a | analysis_event created with correct fields | PASS | Event `f7569867` has `data_source=fresh`, `outcome=success`, `snapshot_id=683e4c21`, `estimated_cost=0.011` |
| 2b | Apify provider_call_log linked to event | PASS | Log `8cbf32a1` linked to event `f7569867` |
| 3 | enrichment_jobs rows created | **FAIL** | Table is empty (0 rows). Code was not deployed when last fresh run happened |
| 4 | enrichment_status in snapshot payload | **FAIL** | Snapshot `683e4c21` has `enrichment_status: null` |
| 5 | enrich-snapshot endpoint works | **CANNOT TEST** | No pending jobs exist to process |
| 6 | Provider cost attribution via enrichments | **FAIL** | OpenAI calls (29 total) have 0 linked to any event; DataForSEO (11 total) also 0 linked |
| 7 | Idempotency | **CANNOT TEST** | No enrichment cycle has run |
| 8 | Cache-only protection | PASS | System in cache_only; no provider calls created on May 6 14:20+ (the apify call was from a fresh run) |
| 9 | Failure handling | **CANNOT TEST** | No jobs have run |

## Bugs Found

### BUG-1: Admin enrichment-jobs endpoint queries wrong table
`fetchEnrichmentJobSummary()` in `system-queries.server.ts:1158` queries `comment_enrichment_jobs` instead of the new `enrichment_jobs` table. The admin card shows comment scraper jobs (2 completed), not the enrichment pipeline jobs.

### BUG-2: storeSnapshot upserts on cache_key — enrichment data loss risk
`storeSnapshot` uses `.upsert(row, { onConflict: "cache_key" })`. When a second fresh analysis runs for the same handle, the entire `normalized_payload` is replaced with the new base payload (which has all enrichments reset to `pending`). Any completed enrichments from the previous run are lost.

This is a design issue: the base snapshot should not overwrite enrichment results that were patched in asynchronously. Either:
- The upsert must merge `enrichment_status` from the existing payload, or
- Enrichment results must be stored separately from the base snapshot.

### BUG-3: OpenAI/DataForSEO calls never get analysis_event_id
Looking at the provider linkage data: Apify has 34 total / 12 linked, OpenAI has 29 total / 0 linked, DataForSEO has 11 total / 0 linked. The enrichment runner functions pass `analysisEventId` to `generateInsights`, `generateVisualCoverAnalysis`, etc., but we need to verify those functions actually write it to `provider_call_logs.analysis_event_id`. The `linkProviderCallsToEvent` in `enrich-snapshot.ts:229` uses `oldestJob.created_at` as the `since` timestamp, which should catch calls made during enrichment, but this code has never run.

### BUG-4: Fire-and-forget fetch may not work on Workers
The `analyze-public-v1.ts:793` fires `fetch()` to trigger enrichment but `.catch()` silently swallows errors. On Cloudflare Workers, the Worker may terminate before the fire-and-forget fetch completes, and the triggered endpoint response is never awaited. The enrichment endpoint itself runs as a separate Worker invocation, so the fetch trigger should work, but if the Worker dies mid-flight the jobs stay `pending` forever with no retry mechanism (no pg_cron sweep yet).

## Data Snapshot

- **Snapshot ID tested**: `683e4c21-60e0-4045-b43a-dfcd85fe9896`
- **analysis_event_id tested**: `f7569867-fb5a-4604-83f6-c87d9ceb8cf5`
- **enrichment_jobs by status**: 0 total (table empty)
- **provider_call_logs**:
  - apify: 34 total, 12 linked
  - openai: 29 total, 0 linked
  - dataforseo: 11 total, 0 linked

## Recommended Fixes (in order)

### Fix 1: Update admin enrichment-jobs endpoint
Change `fetchEnrichmentJobSummary` to query the `enrichment_jobs` table (not `comment_enrichment_jobs`). Adjust status names to match (`pending`/`running`/`success`/`error` vs `pending`/`processing`/`completed`/`failed`).

### Fix 2: Publish and run a fresh analysis
The code must be deployed (published) before it can be tested. After publishing, switch to Fresh mode and trigger one analysis for the allowlisted test profile to validate the full flow end-to-end.

### Fix 3: Protect enrichment data during snapshot upsert
Before the base snapshot upsert, if an existing snapshot has non-pending enrichment data, preserve those fields in the new payload. Alternatively, skip the enrichment_status reset if enrichments already completed.

### Fix 4: Add waitUntil or rely on pg_cron sweep
The fire-and-forget `fetch` is fragile. Adding a pg_cron sweep (every 2 minutes) to call `/api/public/enrich-snapshot` with `{ sweep: true }` is the reliable safety net. This was already planned but not yet implemented.

These fixes should be implemented before re-running the full QA checklist.
