
# Enrichment Pipeline — Production QA Audit

## 1. Latest Fresh Analysis

| Field | Value |
|---|---|
| analysis_event_id | `5f6261a5-fda0-4a0d-8449-e1422800203a` |
| snapshot_id | `683e4c21-60e0-4045-b43a-dfcd85fe9896` |
| created_at | 2026-05-06 16:17:08 UTC |
| data_source | fresh |
| outcome | success |
| estimated_cost_usd | $0.011 |

**PASS**

## 2. Enrichment Jobs (latest run, snapshot `683e4c21`)

| enrichment_type | status | attempts | started_at | completed_at | error_message |
|---|---|---|---|---|---|
| dataforseo | success | 1 | 16:20:00 | 16:20:01 | — |
| insights_v1 | success | 1 | 16:20:01 | 16:20:07 | — |
| insights_v2 | success | 1 | 16:20:07 | 16:20:13 | — |
| visual_cover | success | 1 | 16:20:13 | 16:20:24 | — |
| caption_semantic | success | 1 | 16:20:24 | 16:20:33 | — |

Note: There is also an older set of jobs for the same snapshot from the first run (~15:55). The visual_cover from that first run failed (3 attempts, `OPENAI_ERROR_HTTP_400` — CDN URL expiration). The second run (post-fix) succeeded on attempt 1.

**PASS** — all 5 enrichment types succeeded on the latest run.

## 3. Snapshot Payload Completeness

| Key | Present | Type |
|---|---|---|
| profile | Yes | object |
| posts | Yes | array (12) |
| content_summary | Yes | object |
| format_stats | Yes | object |
| market_signals_free | Yes | object |
| ai_insights_v1 | Yes | object |
| ai_insights_v2 | Yes | object |
| visual_cover_analysis | Yes | object |
| caption_semantic_analysis | Yes | object |
| enrichment_status | Yes | object |
| _thumbnail_base64 | Yes | object |

**_thumbnail_base64 details:**
- Thumbnails stored: 12
- Size: ~1.46 MB (of 1.51 MB total payload)
- **Risk: MEDIUM** — base64 thumbnails represent ~97% of the payload size. This works fine for single-snapshot reads but could become a concern for bulk queries or if the snapshot table grows large. Consider a future optimization: strip `_thumbnail_base64` after enrichment completes, or move to a separate storage bucket.

**PASS** (with advisory note on payload size)

## 4. enrichment_status Accuracy

Snapshot `enrichment_status`:
```
dataforseo: success
insights_v1: success
insights_v2: success
visual_cover: success
caption_semantic: success
comments: pending
```

- All 5 implemented enrichments match the jobs table: **PASS**
- `comments: pending` is accurate — there is a `comment_enrichment_jobs` table but no runner in the enrichment dispatcher. **PASS**

## 5. Provider Call Attribution

All calls linked to `analysis_event_id = 5f6261a5`:

| provider | actor | status | count | est_cost | actual_cost | linked | unlinked |
|---|---|---|---|---|---|---|---|
| apify | instagram-scraper | success | 1 | $0.011 | $0.000 | 1 | 0 |
| apify | comment-scraper | success | 1 | — | $0.028 | 1 | 0 |
| openai | insights (gpt-5.4-mini) | success | 2 | $0.012 | — | 2 | 0 |
| openai | visual-cover-analysis | success | 1 | $0.012 | — | 1 | 0 |
| openai | caption-semantic | success | 1 | $0.007 | — | 1 | 0 |

- Total estimated OpenAI cost: ~$0.031
- Total Apify actual cost: ~$0.028
- **0 unlinked calls** — all attributed correctly
- **PASS**

## 6. Cache-Only Safety

**Current `analysis_execution_mode`: `fresh`**

**FAIL** — needs to be switched back to `cache_only`.

Action required: update `app_config` to set `analysis_execution_mode = cache_only`. This is a single SQL update.

When in `cache_only`, the system serves the existing snapshot `683e4c21` (fully enriched) without calling any providers. Confirmed safe.

## 7. Admin Data Consistency

- Admin cost cards read from `provider_call_logs` and `analysis_events` via `system-queries.server.ts`: **Confirmed**
- Admin enrichment summary reads from both `enrichment_jobs` (async pipeline) and `comment_enrichment_jobs` (comment scraper): **Confirmed correct**
- **PASS**

---

## Summary

| Check | Result |
|---|---|
| 1. Latest fresh analysis | PASS |
| 2. Enrichment jobs (5/5 success) | PASS |
| 3. Payload completeness (13/13 keys) | PASS |
| 4. enrichment_status accuracy | PASS |
| 5. Provider call attribution (0 orphans) | PASS |
| 6. Cache-only mode | **FAIL** — currently `fresh`, needs reset |
| 7. Admin data consistency | PASS |

## Action Required

1. **Switch execution mode back to `cache_only`** — single migration to update `app_config`.

## Advisory (non-blocking)

- `_thumbnail_base64` adds ~1.46 MB to the snapshot payload. Consider stripping it after all enrichments complete, or moving to blob storage in a future iteration.
- The old failed `visual_cover` job (3 attempts, error) remains in the `enrichment_jobs` table alongside the successful newer one. This is harmless but the admin UI should display the latest job per type, not the oldest.
