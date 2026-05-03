
# Fix budget constants + smoke test

## Problem

The comment scraper budget constants in `src/lib/analysis/comment-scraper.server.ts` do not match the stated constraints:

- `COMMENT_SCRAPER_TARGET_COST_USD` is `0.23` — should be `0.15`
- `HARD_MAX_CHARGE_CEILING` is `0.25` — should be `0.20`
- `COMMENT_SCRAPER_MAX_CHARGE_USD` defaults to the ceiling (`0.25`) — should default to `0.20`
- `COMMENT_SCRAPER_PER_POST_LIMIT` is `10` and `COMMENT_SCRAPER_MAX_POSTS` is `12`, giving 120 results at ~$0.228. With a $0.20 ceiling, the max affordable results are ~105 (floor(0.20/0.0019)), so the per-post limit or max-posts must be reduced.

Running a test now would send `maxTotalChargeUsd: $0.25` to Apify, violating the hard cap.

## Step 1 — Fix constants

In `src/lib/analysis/comment-scraper.server.ts`:

1. Change `COMMENT_SCRAPER_TARGET_COST_USD` from `0.23` to `0.15`
2. Change `HARD_MAX_CHARGE_CEILING` from `0.25` to `0.20`
3. `COMMENT_SCRAPER_MAX_CHARGE_USD` already clamps to ceiling, so it will naturally become `0.20`
4. `COMMENT_SCRAPER_MAX_TOTAL_RESULTS` will auto-adjust via `Math.floor(0.20 / 0.0019)` = 105
5. With 12 posts and 105 max results, per-post limit becomes `floor(105/12) = 8` (down from 10)
6. Update doc comments to reflect $0.15 target / $0.20 ceiling

New effective budget at 12 posts: 8 x 12 = 96 results, estimated $0.1824. Within $0.20 cap.

No other files need changes — all consumers reference these exported constants.

## Step 2 — Validate build

Run `tsc` and `vitest` to confirm no regressions.

## Step 3 — Pre-flight verification

Read the effective values from server logs or source to confirm:
- Target: $0.15
- Hard cap: $0.20
- `maxTotalChargeUsd`: $0.20
- Per-post limit: 8
- Max posts: 12
- Max total results: 96
- Estimated max cost: ~$0.1824
- Cannot exceed $0.20

## Step 4 — Run one fresh analysis

Use the admin force-refresh endpoint for `frederico.m.carvalho` to bypass cache and trigger a fresh analysis including the comment scraper.

## Step 5 — Full verification

After the analysis completes, perform the full A-through-G verification checklist from the task:
- Analysis result (fresh vs cache, comment scraper outcome)
- Comment Intelligence aggregated data (no PII)
- Privacy validation (no raw comments in snapshot)
- UI validation (Q05 block, transparency strip, no PRO language)
- Cost validation (provider_call_logs, attribution, estimated vs actual)
- Admin validation (sistema, cost breakdown, mobile layout)
- Final recommendation (PASS / PARTIAL PASS / FAIL)

## Files changed

- `src/lib/analysis/comment-scraper.server.ts` — budget constants only (lines 47-50, 73-78, 88-97, doc comments)
