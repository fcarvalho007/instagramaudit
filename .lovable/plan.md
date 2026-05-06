
## Audit: Provider Call Attribution Status

### Current state in codebase (not yet published)

| Provider | Actor | File | Passes analysisEventId directly? | Caught by linkProviderCallsToEvent? | Status |
|----------|-------|------|----------------------------------|-------------------------------------|--------|
| Apify | instagram-scraper | analyze-public-v1.ts (L367/395) | NO (runs before event created) | YES (time-window link at L1203) | OK |
| Apify | comment-scraper | enrich-comments.ts (L130/190) | YES (from job row) | N/A | OK |
| OpenAI | insights v1 | openai-insights.server.ts | YES (L1000 passes it) | Also caught by link | OK |
| OpenAI | insights v2 | openai-insights.server.ts | YES (L1039 passes it) | Also caught by link | OK |
| OpenAI | visual-cover | visual-cover-analysis.server.ts | YES (L1093 passes it) | Also caught by link | OK |
| OpenAI | caption-semantic | caption-semantic-analysis.server.ts | YES (L1132 passes it) | Also caught by link | OK |
| DataForSEO | google_trends | market-signals.ts → client.ts | **NO** — not passed through | **PARTIAL** — linkProviderCallsToEvent catches by handle+time, but DFS runs BEFORE event exists | **GAP** |

### Production DB evidence (not yet published)

- OpenAI: 0% linked (28/28 calls without event_id) — code fix exists but isn't deployed
- DataForSEO: 0% linked (11/11 calls without event_id) — code fix partially exists (client.ts accepts it, but `buildMarketSignals` doesn't propagate it)
- Apify scraper: 26.7% linked — older calls pre-fix, recent ones ARE linked via time-window
- Apify comments: 100% linked

### Remaining gaps to fix

**Gap 1 — DataForSEO: `buildMarketSignals` doesn't accept or propagate `analysisEventId`**

The `callDataForSeo` client already accepts `analysisEventId` (added in previous session). But `buildMarketSignals` → `buildSignalsInner` → endpoint functions (`fetchGoogleTrends`, `fetchKeywordIdeas`, `fetchSerpOrganic`) don't pass it through.

Since DFS runs BEFORE `analysisEventId` exists (line ~833 vs event creation at ~967), direct propagation isn't possible. However, `linkProviderCallsToEvent` (line 1203) should catch these by time-window. The fact that production shows 0% linked means either:
- The link call wasn't in the deployed code yet, OR
- DFS `handle` doesn't match (need to verify)

Fix: Verify `linkProviderCallsToEvent` correctly matches DFS calls. The DFS client stores `handle` as `ownerHandle` — check it's lowercase and matches.

**Gap 2 — `linkProviderCallsToEvent` may not catch all OpenAI/DFS calls**

Even though OpenAI calls now pass `analysisEventId` directly, the `linkProviderCallsToEvent` fallback at L1203 should also catch them. The fact that production shows 0% means the published code doesn't include the changes yet.

### Implementation

1. **Add `analysisEventId` propagation to `buildMarketSignals`** — accept it in `BuildMarketSignalsOptions`, pass it through `buildSignalsInner` to each endpoint call. This is belt-and-suspenders alongside `linkProviderCallsToEvent`.

2. **Pass `analysisEventId` from `analyze-public-v1.ts` to `buildMarketSignals`** — but since DFS runs before event creation, use `linkProviderCallsToEvent` as primary mechanism (already exists at L1203).

3. **Add a legacy-data comment** in `fetchReportCounts` explaining old logs may have null `analysis_event_id`.

4. **No changes needed** to: expense-section UI, confidence logic, P04/P05/P07, report UI, pricing.

### Files to change

- `src/lib/dataforseo/market-signals.ts` — add `analysisEventId` to options, propagate to endpoint calls
- `src/lib/dataforseo/endpoints/google-trends.ts` — accept and pass `analysisEventId`
- `src/lib/dataforseo/endpoints/keyword-ideas.ts` — accept and pass `analysisEventId`
- `src/lib/dataforseo/endpoints/serp-organic.ts` — accept and pass `analysisEventId`
- `src/lib/admin/system-queries.server.ts` — add legacy-data comment
- Validate with `tsc --noEmit` and `vitest run`

### Key conclusion

The previous session's changes (OpenAI/visual-cover/caption-semantic `analysisEventId` propagation + `linkProviderCallsToEvent` fallback + defensive warn) are correct in the codebase but **not yet published**. Once published, OpenAI and Apify calls will be linked. The only remaining code gap is DataForSEO endpoint propagation for belt-and-suspenders coverage.
