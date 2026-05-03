
# Comment Scraper Budget Hardening

## Audit Findings

| Parameter | Current Value | Required Value |
|---|---|---|
| `COMMENT_SCRAPER_MAX_POSTS` | 3 (default), max 12 | **12** (default), max 12 |
| `COMMENT_SCRAPER_RESULTS_LIMIT` | 20/post | **7/post** (see below) |
| `COMMENT_SCRAPER_MAX_CHARGE_USD` | **$1.50** (default), max $5.00 | **$0.20** (default), max $0.20 |
| `COMMENT_SCRAPER_MAX_TOTAL_COMMENTS` | 60 | **80** |
| Post selection | Sorted by comments desc, top 12 | Same (already correct) |
| Post source | `primaryEnriched.posts` from base actor | Correct, no extra fetching |
| Post URLs | Validated with `isValidInstagramPostUrl` | Correct |

### Key observations

1. **Posts are already sourced from the base actor** — `primaryEnriched.posts` in `analyze-public-v1.ts:1056`. No extra discovery. Already correct.

2. **Post count**: The code already slices to 12 (`postUrls.slice(0, 12)` at line 1067 of analyze, and `urls.slice(0, COMMENT_SCRAPER_MAX_POSTS)` in the scraper). But `COMMENT_SCRAPER_MAX_POSTS` defaults to 3 — must change to 12.

3. **`resultsLimit` semantics**: Based on the actor docs comment in the code (line 13-18), `resultsLimit` is **global** (total results across all URLs), not per-URL. The actor returns a flat list. With 80 results at ~$0.0019/result = $0.152 estimated cost.

4. **Replies**: Nested inside each comment object (not separate charged results). They are part of the result count. `includeNestedComments: true` is correct.

5. **`maxTotalChargeUsd`**: Passed to Apify API as a query parameter — this is the Apify-side budget guard. Currently set to $1.50.

6. **`provider_call_logs` has no metadata/JSON column** — extra fields like `estimatedMaxCostUsd`, `selectedPostCount`, etc. cannot be stored without a migration. Will log them to console instead and note the limitation.

## Budget Math

- Pricing assumption: ~$1.90 per 1,000 results = $0.0019/result
- Target: $0.15 → 79 results max
- Hard cap: $0.20 → 105 results max
- **Safe default**: `COMMENT_SCRAPER_MAX_TOTAL_RESULTS = 80` (≈$0.152)
- Per-post: Since `resultsLimit` is global, set it to 80 directly. The per-post concept doesn't apply to this actor.

## Changes

### 1. `src/lib/analysis/comment-scraper.server.ts`

- Change `COMMENT_SCRAPER_MAX_POSTS` default from 3 to **12**, keep max clamp at 12
- Rename `COMMENT_SCRAPER_RESULTS_LIMIT` to `COMMENT_SCRAPER_MAX_TOTAL_RESULTS`, default **80**, max clamp at **105**
- Change `COMMENT_SCRAPER_MAX_CHARGE_USD` default from $1.50 to **$0.20**, **hard clamp max at $0.20** (env vars above this are clamped down with a warning log)
- Add `COMMENT_SCRAPER_TARGET_COST_USD = 0.15` constant (informational)
- Add pre-flight budget check before calling `runActorWithMetadata`:
  - Calculate `estimatedMaxCostUsd = maxTotalResults * 0.0019`
  - If exceeds $0.20, reduce results limit until it fits
  - If impossible (< 1 result), skip and return `budget_blocked` state
- Log budget plan to console before each run
- Remove `COMMENT_SCRAPER_MAX_TOTAL_COMMENTS` (replaced by `MAX_TOTAL_RESULTS`)
- Export new constant names for consumers

### 2. `src/routes/api/public/enrich-comments.ts`

- Update imports to use new constant names
- Add structured console logging with budget fields (selectedPostCount, estimatedMaxCostUsd, hardMaxCostUsd, actualCostUsd, costStatus)
- Handle `budget_blocked` return from the scraper

### 3. `src/lib/admin/system-queries.server.ts`

- Update `CommentScraperMetrics` to reflect new constant names and defaults
- Update `fetchCommentScraperMetrics` to read new env var names

### 4. `src/components/admin/v2/sistema/comment-scraper-card.tsx`

- Update references to renamed fields (max_comments_per_post becomes max_total_results)

### 5. `src/routes/api/analyze-public-v1.ts`

- Update import if constant names changed
- No logic changes needed (post selection is already correct)

### 6. `src/components/admin/v2/sistema/costs-detail-section.tsx`

- Update any references to old constant names

## Limitations noted

- `provider_call_logs` has no metadata JSON column — extended budget fields will be logged to console only (no schema migration needed for this change)

## Expected final state

- **Max theoretical cost**: $0.20 (hard clamped, both in-code and via Apify `maxTotalChargeUsd`)
- **Target cost**: ~$0.15 (80 results * $0.0019)
- **$1.50 max charge**: impossible (env var clamped to $0.20 max, with warning)
- **Post selection**: base actor posts only, up to 12, validated URLs, deduped
- **resultsLimit**: 80 (global, not per-post)
