
# Comment Scraper Integration Audit

## 1. Actor Input Payload

**Current payload** (comment-scraper.server.ts L152-158):
```
{
  directUrls: urls,
  resultsLimit: 20,
  includeNestedComments: true,
  isNewestComments: true,
}
```

**Assessment**: The field names `directUrls`, `resultsLimit`, `includeNestedComments`, `isNewestComments` match the codebase TODO comment referencing the documented schema as of 2025-05 (L13-14). However, there is a **TODO at L12 that says "Verify actor input/output schema against a real Apify run"** — these names have never been validated against a live run.

**Risk**: MEDIUM. If the actor expects different field names (e.g. `urls` instead of `directUrls`), the run succeeds but returns zero comments.

**Fix**: Add a structured console.info log of the sanitized payload before calling the actor, so the first live run produces immediate proof of what was sent vs what was returned.

---

## 2. Sanitized Audit Log

**Current state**: Only a brief `console.info` with post count (L1063-1066). No structured log of the full input config.

**Fix**: Add a sanitized payload log before the actor call with: actor, requestedPostUrlsCount, effectivePostUrlsCount, resultsLimit, includeReplies, maxChargeUsd, timeoutMs, selectedPostStrategy, featureFlag status.

---

## 3. Post URL Validation

**Current state**: Posts are filtered by `!!p.permalink` (L1049), then sliced. The `fetchCommentsForPosts` also slices to `COMMENT_SCRAPER_MAX_POSTS`. No URL format validation. No deduplication.

**Risks**:
- Duplicate URLs waste Apify budget
- Non-Instagram URLs would be silently sent

**Fix**: Add deduplication and basic Instagram URL validation before calling.

---

## 4. Real Apify Cost Capture

**Current state**: PASS. `runActorWithMetadata` (apify-client.ts) does a dedicated step 4 re-fetch of the run details to read `usageTotalUsd` after the run succeeds. If it can't be read, falls back to `null`. This is the real Apify ledger cost.

The comment scraper passes `commentResult.actualCostUsd` to `recordProviderCall` (L1082). If null, it maps to `null` in the DB (not zero).

**Verdict**: Cost capture is correct. Real cost or null — never fake zero.

---

## 5. provider_call_logs Storage

**Current state**: Mostly correct, but with issues:

| Field | Current value | Issue |
|-------|--------------|-------|
| `postsReturned` | `commentResult.commentsReturned` | **WRONG** — field name says "posts" but stores comment count. Misleading in admin queries. |
| `httpStatus` | `200` hardcoded on success | Acceptable (Apify async flow has no single HTTP status) |
| `actualCostUsd` | Real from Apify | PASS |
| `apifyRunId` | Real | PASS |
| `durationMs` | Real | PASS |
| `status` | "success" / "network_error" | The error catch uses "network_error" for ALL failures, including config errors, timeouts. Should differentiate. |

**Missing data**: No way to store `postsRequested`, `postsAnalysed`, `repliesReturned`, or `featureArea` in structured columns — the schema doesn't have them. But `error_excerpt` is a text field that only stores errors.

**No metadata/details JSON column exists** in `provider_call_logs` to store extra structured data.

---

## 6. Admin Visibility

**Current state**: The `CommentScraperCard` component and `fetchCommentScraperMetrics` query **already exist and work**. They read from `provider_call_logs` filtered by `actor = 'apify/instagram-comment-scraper'`.

**Issues found**:

| Issue | File | Line |
|-------|------|------|
| Admin card says "análise PRO" | comment-scraper-card.tsx | L100 (`"Custo adicional por análise PRO"`) |
| Hardcoded guardrails don't match actual defaults | system-queries.server.ts | L606-608: `max_charge_usd: 3.0, max_posts: 12, max_comments_per_post: 50` but actual defaults are 1.50, 3, 20 |
| `comments_returned` reads from `posts_returned` column | system-queries.server.ts | L588: confusing field reuse |

---

## 7. Data Safety (GDPR)

**PASS**. Raw comment text is used only transiently in `aggregateCommentIntelligence` for signal classification. The persisted `CommentIntelligence` object contains only aggregate counts, percentages, and signal labels. No raw text, no third-party usernames, no profile pictures.

---

## Implementation Plan

### File 1: `src/lib/analysis/comment-scraper.server.ts`
- Add `repliesReturned` to `CommentScraperResult`
- Count replies separately during parsing

### File 2: `src/routes/api/analyze-public-v1.ts`
- Add sanitized payload audit log before actor call
- Deduplicate + validate Instagram URLs before calling
- If no valid URLs after filtering, set `buildUnavailableCommentIntelligence` with reason `"no_valid_post_urls"`
- Fix `postsReturned` to actually store comments count (field is misnamed in schema but it's what we have)
- Improve error status mapping: use "config_error" for `ApifyConfigError`, "timeout" for timeout, "network_error" for the rest
- Extract `actualCostUsd` from error object when available (the thrown error carries it)

### File 3: `src/lib/admin/system-queries.server.ts`
- Replace hardcoded guardrail values with actual constants imported from comment-scraper.server.ts
- Note: the import will work because this is a `.server.ts` file

### File 4: `src/components/admin/v2/sistema/comment-scraper-card.tsx`
- Replace "análise PRO" with "relatório gratuito" or neutral copy

### File 5: `src/lib/analysis/types.ts`
- Add `"no_valid_post_urls"` to the `reason` union type

### File 6: Tests
- Update existing tests if needed
- Add test for URL dedup/validation logic

### No schema migration needed
The `posts_returned` column is reused for comment count — not ideal naming but functional. No new columns required.
