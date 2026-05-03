
# CRITICAL: `resultsLimit` is PER URL, not global

## Finding

Apify documentation (confirmed on input schema page, 2026-05-03):

> **resultsLimit** — Set the number of comments you expect to scrape **from each post or reel**.
> If set to **5**, you will get **5** comments per URL. If you add 2 URLs, you will extract **10** results altogether.

The current code on line 247 of `comment-scraper.server.ts` comments `// Global total (not per-URL)` — this is **incorrect**.

## Impact

| Scenario | Current assumption | Reality |
|---|---|---|
| 12 URLs, `resultsLimit: 80` | 80 total comments, ~$0.152 | **960 total comments, ~$1.82** |
| Budget hard cap $0.20 | Respected | **Exceeded by 9×** |

The `maxTotalChargeUsd: $0.20` Apify-level cap would stop the run at ~105 results, but the cost would hit $0.20 instead of $0.15, and more importantly the intent of the limit is violated.

## Fix — no test needed

The documentation is unambiguous. A live test would only confirm what's already documented. Spending $0.02 on a confirmation test is unnecessary.

## Required changes

### 1. `planCommentBudget()` — compute `perPostLimit`

```
perPostLimit = floor(maxTotalResults / selectedPostCount)
```

- With 12 posts and `maxTotalResults = 80`: `perPostLimit = floor(80/12) = 6`
- Theoretical max: `6 × 12 = 72 comments` → ~$0.137 (under target $0.15)
- With 1 post: `perPostLimit = 80` (full budget)
- Hard floor: `perPostLimit >= 1`

### 2. Actor call — use `perPostLimit` instead of `adjustedResultsLimit`

```ts
resultsLimit: budget.perPostLimit,  // PER URL — actor multiplies by URL count
```

### 3. Update constants/comments

- Fix the misleading comment `// Global total (not per-URL)` → `// PER URL — total = this × URL count`
- Add `perPostLimit` to `CommentBudgetPlan` interface
- Recalculate `estimatedMaxCostUsd` = `perPostLimit × selectedPostCount × COST_PER_RESULT_USD`

### 4. Files changed

- `src/lib/analysis/comment-scraper.server.ts` — budget formula + actor input + comments

### 5. Files NOT changed

- No schema changes, no admin/frontend changes, no payment/auth changes

## Validation

- `bunx tsc --noEmit`
- `bunx vitest run`
