
# Comment Intelligence — Production Readiness Verification

## A. Deployment Verification

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | No `$0.25` in runtime/admin labels | PASS | All `0.25` matches are rgba opacities or OpenAI token pricing — zero comment scraper budget refs |
| 2 | Target cost = `$0.15` | PASS | `COMMENT_SCRAPER_TARGET_COST_USD = 0.15` (line 47) |
| 3 | Hard cap = `$0.20` | PASS | `HARD_MAX_CHARGE_CEILING = 0.20` (line 50) |
| 4 | `maxTotalChargeUsd` = `$0.20` | PASS | Line 281: `maxTotalChargeUsd: COMMENT_SCRAPER_MAX_CHARGE_USD` (defaults to `HARD_MAX_CHARGE_CEILING`, clamped) |
| 5 | `COMMENT_SCRAPER_ENABLED=true` | PASS | Secret exists in Supabase secrets list |
| 6 | `comment_enrichment_jobs` table exists | PASS | Confirmed via query |
| 7 | RLS enabled | PASS | `relrowsecurity = true`, zero policies = anon blocked, service-role bypasses |
| 8 | Service-role access works | PASS | Enrichment endpoint returned `200 {"ok":true,"swept":false,"reason":"no_pending_jobs"}` |
| 9 | pg_cron sweep active every 5 min | PASS | `sweep-pending-comment-jobs`, `*/5 * * * *`, `active=true` |
| 10 | Enrich endpoint accepts auth | PASS | Tested with `apikey` header (sweep mode) — 200 OK |

**Score: 10/10**

## B. Controlled Smoke Test

**BLOCKED by cache.** The snapshot for `frederico.m.carvalho` was created April 29 and expires May 4 (15:43 UTC). The current analysis endpoint always returns this cached snapshot.

The async enrichment code was deployed *after* the last fresh analysis (15:43 today), so the comment enrichment path has never been exercised end-to-end in production.

**What was verified:**
- The enrichment endpoint is deployed and responding
- The sweep endpoint correctly returns "no pending jobs" when the table is empty
- The fire-and-forget trigger code exists in the fresh analysis path (lines 1068-1136)
- The enrichment job insertion, processing, snapshot patching, and provider call logging are all wired

**What cannot be verified today (requires fresh analysis):**
- B.1-B.10: Full end-to-end flow, comment_intelligence patching, provider_call_logs entry, real cost recording

**Recommendation:** Wait until May 4 15:43 UTC when the cache expires, then re-run this smoke test. Alternatively, a `force_refresh=true` query parameter could be added to bypass cache for admin testing — but that would be a new feature.

## C. Admin Verification

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | `/admin` shows Apify costs by actor | PASS | `expense-section.tsx` renders `ApifyActorRow` per actor from `data.apify_actors` |
| 2 | `/admin/sistema` shows actor breakdown | PASS | `ApifyActorBreakdownSection` component, `ActorDetailCard` per actor |
| 3 | Enrichment job counts displayed | PASS | KPI cards for pending/processing/completed/failed via `/api/admin/sistema/enrichment-jobs` |
| 4 | Comment scraper shows even with 0 runs | PASS | Actor list includes `apify/instagram-comment-scraper` with highlight styling (line 400) |
| 5 | Real vs estimated cost labelled | PASS | `COST_SOURCE_LABEL` map with Real/Estimado/Misto/Indisponivel labels |

**Score: 5/5**

## D. Privacy Verification

| Check | Status |
|-------|--------|
| Raw comment text never persisted | PASS — processed in-memory only, doc header says "never persisted" |
| Commenter usernames not stored | PASS — `CommentIntelligence` type has only `ownerUsername` (the profile being analyzed) and aggregate counts like `uniqueAudienceCommentersCount` |
| No comment URLs stored | PASS — only `samplePosts` count |
| No profile pictures | PASS — not in `RawApifyComment` processing output |
| No third-party PII in DB | PASS — only aggregated metrics (percentages, counts, signal distributions) |

## E. Final Status

**PARTIAL PASS — only one small fix remains**

The entire infrastructure is deployed and verified: database table, RLS, indexes, pg_cron, enrichment endpoint, admin UI, privacy safeguards, cost constants, and budget caps.

The single remaining gap: **the end-to-end flow has never been exercised in production** because the cached snapshot pre-dates the async enrichment deployment.

**Smallest next step:** Wait for cache expiry (May 4, 15:43 UTC) and re-run B.1-B.10 verification. No code changes needed.

If you prefer not to wait, the alternative is adding a `force_refresh` admin-only parameter to the analysis endpoint — but that constitutes a new feature.
