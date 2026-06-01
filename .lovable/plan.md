# Apify Lab — minimal smoke (baseline + 30d)

The lab endpoint `/api/admin/apify-lab` is admin-gated (`requireAdminSession`) and triggers real Apify calls + DB writes. I cannot invoke it from here without your admin session — so this is a **collaborative** smoke:

## Steps

1. **You** go to `/admin/apify-lab` and trigger exactly two runs for handle `frederico.m.carvalho`:
   - `baseline` (details mode, current production free-report shape)
   - `30d` (posts mode, `onlyPostsNewerThan: "30 days"`, `resultsLimit: 100`)
   Do **not** trigger 60d / 90d / 365d.
2. **Me**, right after: query `public.apify_lab_runs` for the two rows just inserted and produce the comparison table with all the requested columns (mode, resultsType, resultsLimit, onlyPostsNewerThan, raw_items_returned, posts_extracted, newest_post_at, oldest_post_at, observed_days, duration_ms, actual_cost_usd, status, semantic_code, error_excerpt).
3. **Me**: apply the decision rule:
   - If `30d` shows a clearly different `raw_items_returned` and/or wider date span vs `baseline` → fix is working, safe to plan the 3×5 matrix in a follow-up.
   - If `30d` still returns exactly 12 posts with the same `newest_post_at` / `oldest_post_at` as `baseline` → stop. Investigate whether `apify/instagram-scraper` actually honours `resultsType: "posts"` + `onlyPostsNewerThan` for this handle, or whether the actor input shape in `buildActorInput` needs adjustment. Do **not** run the 3×5 matrix.

## Why I can't just run it

- The lab route requires an admin session cookie I don't have.
- It charges real Apify credits — gating on your manual trigger is correct.

## What I will NOT do in this turn

- No production code changes.
- No 3×5 matrix.
- No changes to `analyze-public-v1`, OpenAI, DataForSEO, snapshots, leads, emails, thumbnails.

## Checkpoint

- ☐ You trigger `baseline` + `30d` for `frederico.m.carvalho` in `/admin/apify-lab`
- ☐ You tell me "done" (or just send another message)
- ☐ I read `apify_lab_runs` and output the comparison table
- ☐ I issue the go / no-go verdict on the full matrix
