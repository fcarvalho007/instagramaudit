
# Fixed 10 comments per post

## What changes

The user wants `resultsLimit = 10` per post/reel, replacing the dynamic calculation.

### Budget impact

| Posts | Per-post | Total comments | Est. cost |
|-------|----------|---------------|-----------|
| 1     | 10       | 10            | $0.019    |
| 6     | 10       | 60            | $0.114    |
| 12    | 10       | 120           | $0.228    |

12 posts at 10 each = $0.228, which exceeds the current $0.20 hard cap. Two options:

- **A) Raise hard cap to $0.25** — accommodates 10/post at 12 posts with margin
- **B) Keep $0.20 cap, reduce max posts to 10** — 10×10 = $0.19, fits

I recommend **Option A** (raise to $0.25) since the difference is marginal and 12 posts gives better comment intelligence.

### Changes in `src/lib/analysis/comment-scraper.server.ts`

1. Add new constant `COMMENT_SCRAPER_PER_POST_LIMIT = 10` (overridable via env)
2. Raise `HARD_MAX_CHARGE_CEILING` from `0.20` to `0.25`
3. Update `COMMENT_SCRAPER_TARGET_COST_USD` from `0.15` to `0.23`
4. Update `COMMENT_SCRAPER_MAX_TOTAL_RESULTS` default from 80 to 120 and hard max accordingly
5. Simplify `planCommentBudget()` — use fixed `perPostLimit = 10` instead of `floor(maxTotal / urlCount)`, with safety clamp if `10 × urlCount` exceeds affordable total
6. Update doc comments to reflect fixed 10/post strategy

### Validation

- `bunx tsc --noEmit`
- `bunx vitest run`

### Files changed

- `src/lib/analysis/comment-scraper.server.ts` only

### No changes to

- Admin UI, schema, RLS, auth, frontend, locked files
