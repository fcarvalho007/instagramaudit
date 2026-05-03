
# QA Test — Instagram Comment Scraper Integration

## Current Status

The analysis ran successfully (HTTP 200 on `instagramaudit.lovable.app`), but the comment scraper was **skipped** because `COMMENT_SCRAPER_ENABLED` is not set to `"true"`. No `enrich-comments` call was made, and no `provider_call_logs` row exists for `apify/instagram-comment-scraper`.

## Budget Plan (verified from code)

| Parameter | Value |
|---|---|
| actor | `apify/instagram-comment-scraper` |
| maxPosts | 12 (clamped [1,12]) |
| maxTotalResults | 80 (clamped [5,105]) |
| targetCostUsd | $0.15 |
| hardMaxCostUsd | $0.20 |
| estimatedMaxCostUsd | $0.152 (80 × $0.0019) |
| includeReplies | true |
| timeout | 120s (actor: 110s) |
| selectedPostCount | Up to 12 from base actor posts only |
| maxResultsPerPost | N/A — `resultsLimit` is global |

### Constraints confirmed in code:
- Only base actor posts used (line 1056-1069 of analyze-public-v1.ts)
- $1.50 impossible — `HARD_MAX_CHARGE_CEILING = 0.20`, env values clamped
- Budget blocked if estimated > $0.20
- No PRO/Premium wording in `report-comment-intelligence.tsx`

## Steps to Execute (after approval)

1. **Enable comment scraper** — use `secrets--add_secret` to set `COMMENT_SCRAPER_ENABLED` to `"true"` (or ask user to confirm current value)

2. **Run fresh analysis** — POST to `/api/analyze-public-v1` with `{"instagram_username":"frederico.m.carvalho","competitor_usernames":[]}`

3. **Wait ~30s for async enrichment** — the enrich-comments endpoint runs fire-and-forget

4. **Verify provider_call_logs** — query for `actor = 'apify/instagram-comment-scraper'`:
   - apify_run_id exists
   - actual_cost_usd exists or is explicitly null (not forced to 0)
   - actual_cost_usd <= $0.20 when present
   - posts_returned > 0

5. **Verify snapshot** — check that `normalized_payload->comment_intelligence` exists in the snapshot

6. **Verify report UI** — navigate to `/analyze/frederico.m.carvalho`, check Q05 card:
   - Shows comment intelligence data when available
   - No PRO/Premium wording
   - Neutral fallback for unavailable states

7. **Verify admin** — check:
   - `/api/admin/sistema/comment-scraper` returns config + last run
   - `/api/admin/sistema/expense-30d` includes comment scraper costs

8. **Run validation**:
   - `bunx tsc --noEmit`
   - `bunx vitest run`

9. **Deliver PASS/FAIL table**

## Files involved (read-only audit, no changes needed)
- `src/lib/analysis/comment-scraper.server.ts` — budget constants
- `src/routes/api/public/enrich-comments.ts` — enrichment endpoint
- `src/routes/api/analyze-public-v1.ts` — fire-and-forget trigger
- `src/components/report-redesign/v2/report-comment-intelligence.tsx` — Q05 UI
- `src/components/admin/v2/sistema/comment-scraper-card.tsx` — admin card
- `src/components/admin/v2/visao-geral/expense-section.tsx` — expense display
- `src/lib/admin/system-queries.server.ts` — metrics queries
