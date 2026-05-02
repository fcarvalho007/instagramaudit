
## Backend Hardening — Comment Intelligence

### 1. Fix post-URL grouping with fallback (`comment-scraper.server.ts`)

The Apify `instagram-comment-scraper` output does NOT include a `postUrl`/`inputUrl`/`url` field per comment. The current code tries to match by those fields — when absent, all comments stay orphaned and every batch is empty.

**Changes:**
- Keep the existing field-sniffing logic (postUrl / inputUrl / url) as a best-effort path
- When no back-references are found (or less than 50% match), fall through to a single aggregated batch with all comments under `urls[0]`
- Add `groupedByPost: boolean` to `CommentScraperResult` so the aggregator knows whether per-post stats are reliable
- When `groupedByPost === false`, add a limitation note: "Granularidade por publicação indisponível — métricas agregadas globalmente."
- Add `parseReplies()` helper to safely parse nested reply objects from raw data
- Also handle `/reel/` shortcodes in `findBucket`, not just `/p/`
- Add `durationMs`, `commentsReturned`, `postsRequested` to `CommentScraperResult`
- Export `COMMENT_SCRAPER_MAX_CHARGE_USD` for admin card use
- Add a TODO header noting schema needs verification against a real run

### 2. Add PRO/plan gate helper (`comment-scraper.server.ts`)

**New export:**
```typescript
interface CommentScraperGateInput {
  featureEnabled: boolean;
  isProAnalysis: boolean;
  isInternalTest?: boolean;
}
function shouldRunCommentScraper(input: CommentScraperGateInput): boolean
```

Returns true only if `featureEnabled` AND (`isProAnalysis` OR `isInternalTest`). Default `isProAnalysis` is false everywhere until a plan system exists.

### 3. Fix counting in aggregation (`comment-intelligence.ts`)

- Include reply-level comments in `totalComments` so `sampleComments` reflects true total
- Accept optional `groupedByPost` parameter and append a limitation note when false
- Fix typo "consoante" → "consoante" is correct, but "consoante o que" should be "conforme o que"

### 4. Wire gate + timing + failure logging (`analyze-public-v1.ts`)

- Replace the simple `commentScraperEnabled` boolean with `shouldRunCommentScraper()`
- Default `isProAnalysis: false` and `isInternalTest: true` when `COMMENT_SCRAPER_INTERNAL_TEST === "true"` (so the existing test profile works)
- Capture `Date.now()` before/after the call for real `durationMs`
- Use `commentResult.durationMs` from the scraper result
- In the `catch` block, add a `recordProviderCall` with `status: "network_error"` and the error message
- Replace `postsReturned` with `commentsReturned` from the result (use `postsReturned` field for the actual `postsRequested` count)
- Pass `commentResult.groupedByPost` to the aggregator

### 5. Tests (`src/lib/analysis/__tests__/comment-intelligence.test.ts`)

New test file covering:
- Owner reply detection from nested replies (owner in replies[] counted)
- Brand top-level comment excluded from audience count
- Zero comments returns `available: true` with zeros
- Empty batches array returns baseline result
- `shouldRunCommentScraper` gate logic (all combinations)
- `sampleComments` includes both top-level and reply-level comments
- Aggregation output never contains raw text or usernames (only `ownerUsername` of the profile)

### 6. No changes to

- UI components (no redesign this prompt)
- Database schema (no migration needed — `postsReturned` column repurposed)
- Locked files
- Admin cost card (already mounted)

### Validation

- `bunx tsc --noEmit`
- `bunx vitest run`
