
# Propagate `analysisEventId` to all paid provider calls

## Provider Call Mapping (Before → After)

| Provider | Actor | File | Has `analysisEventId` now? | Change |
|----------|-------|------|---------------------------|--------|
| Apify | profile+posts | `analyze-public-v1.ts` L367,395 | NO (pre-event) | Keep as-is; linked via `linkProviderCallsToEvent` fallback (runs twice) |
| DataForSEO | market-signals | `analyze-public-v1.ts` L833 | NO (pre-event, not passed) | Keep as-is; already caught by final `linkProviderCallsToEvent` at L1204 |
| OpenAI | insights v1 | `openai-insights.server.ts` | YES | No change |
| OpenAI | insights v2 | `openai-insights.server.ts` | YES | No change |
| OpenAI | visual-cover | `visual-cover-analysis.server.ts` | YES | No change |
| OpenAI | caption-semantic | `caption-semantic-analysis.server.ts` | YES | No change |
| Apify | comment-scraper | `enrich-comments.ts` | YES (via job) | No change |

### Key finding

The architecture is already correctly set up:

1. **Pre-event calls** (Apify profile+posts, DataForSEO): These run before `analysisEventId` exists. They are linked via `linkProviderCallsToEvent(handle, providerCallsStartedAt, eventId)` which runs twice:
   - Immediately after event creation (L457-462)
   - After all enrichments finish (L1203-1208)

2. **Post-event calls** (OpenAI insights, visual-cover, caption-semantic): All already receive `analysisEventId` directly.

3. **Async calls** (comment scraper): Already receives `analysis_event_id` via the job record.

### What needs fixing

The only real gap: the **final `linkProviderCallsToEvent` call at L1204** catches DataForSEO calls created before the event, but if the comment enrichment also creates Apify calls asynchronously, those are handled separately via the job's `analysis_event_id`. So the linkage chain is complete.

However, there's a subtle issue: the **cost card in system-queries** defines "complete" as having >= 2 distinct provider groups. This means a report that only used Apify (no OpenAI/DataForSEO due to allowlist) would be excluded from the "complete" count, unfairly lowering confidence.

## Plan

### Step 1: Verify and add a second `linkProviderCallsToEvent` after enrichments

Already exists at L1203-1208. No change needed.

### Step 2: Improve confidence calculation in `system-queries.server.ts`

Current "complete" definition (>= 2 providers) is too strict. Change to: a fresh event with **any** linked provider call counts as a "linked report" for confidence.

- Alta: >= 20 linked fresh reports
- Media: 5-19
- Baixa: < 5

### Step 3: Add legacy data comments

Add doc comments in `system-queries.server.ts` explaining that pre-May-2026 data may have null `analysis_event_id` and confidence will be "baixa" for those periods.

Already present (L808-812). Verify and keep.

### Step 4: No backfill of old logs

Old logs remain with null `analysis_event_id`. The time-window fallback (`linkProviderCallsToEvent`) already handles most cases retroactively. No manual backfill.

## Files to change

1. `src/lib/admin/system-queries.server.ts` — relax "complete" definition from `providers.size >= 2` to `providers.size >= 1`

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run`
