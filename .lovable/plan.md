
# Auditoria de Custo e Dependência: Apify Comment Scraper

## 1. Cost Audit (Last 30 Days)

### Cost by Actor

| Actor | Runs | Total Cost ($) | Avg ($) | Min ($) | Max ($) |
|-------|------|---------------|---------|---------|---------|
| **apify/instagram-comment-scraper** | **6** | **$0.497** | **$0.083** | **$0.018** | **$0.198** |
| insights:gpt-5.4-mini (OpenAI) | 37 | $0.194 | $0.005 | $0.002 | $0.007 |
| google_trends (DataForSEO) | 14 | $0.108 | $0.008 | $0.000 | $0.009 |
| visual-cover-analysis (OpenAI) | 7 | $0.048 | $0.007 | $0.000 | $0.015 |
| caption-semantic-analysis (OpenAI) | 6 | $0.029 | $0.005 | $0.000 | $0.008 |
| **apify/instagram-scraper** | **36** | **$0.024** | **$0.001** | **$0.000** | **$0.011** |
| insights:gpt-5.4-nano | 8 | $0.007 | $0.001 | $0.000 | $0.001 |

**Verdict: The comment scraper is the single most expensive actor, responsible for $0.50 of $0.91 total (55%).**

The profile/posts scraper is 20x cheaper ($0.024 total vs $0.497).

### Billing imports confirm: Apify billed $0.66 total (last 30d), DataForSEO $0.12.

---

## 2. Cost Per Generated Report

Grouping `provider_call_logs` by `analysis_event_id` for real fresh reports:

| Handle | Comment Scraper | Total Report Cost | Comment Cost | Profile+Posts | OpenAI All | DataForSEO |
|--------|----------------|-------------------|-------------|--------------|------------|------------|
| frederico.m.carvalho | Yes | ~$0.070 | $0.028 | $0.000 | $0.032 | ~$0.009 |
| frederico.m.carvalho | Yes | ~$0.070 | $0.028 | $0.000 | $0.032 | ~$0.009 |
| frederico.m.carvalho | Yes | ~$0.066 | $0.028 | $0.000 | $0.031 | ~$0.009 |
| martimsilvai | Yes | ~$0.238 | $0.198 | $0.000 | $0.033 | $0.009 |

### Summary

- **Average report cost WITH comment scraper**: ~$0.11
- **Average report cost WITHOUT comment scraper**: ~$0.04 (OpenAI enrichments + DataForSEO only)
- **Estimated savings if disabled**: ~$0.07/report (63% reduction for frederico; up to $0.20 for larger profiles like martimsilvai)
- **Comment scraper = 40-83% of total report cost** depending on profile size

The martimsilvai report cost $0.20 just for comment scraping -- that single run is more expensive than all OpenAI enrichments combined across all reports.

---

## 3. Functional Dependency Map

Files that import or use `comment_intelligence`:

| File | Usage |
|------|-------|
| `src/lib/analysis/types.ts` | Type definition (`CommentIntelligence`) |
| `src/lib/report/snapshot-to-report-data.ts` | Maps `normalized_payload.comment_intelligence` to report data (line 1313) |
| `src/components/report-redesign/v2/report-diagnostic-block.tsx` | Passes `commentIntel` to Q05 card and `DiagnosticAudienceHighlight` |
| `src/components/report-redesign/v2/report-comment-intelligence.tsx` | 497-line component rendering comment intelligence detail (audience highlight, sample comments, unavailable state) |
| `src/routes/api/public/enrich-comments.ts` | Enrichment endpoint that fetches + patches comment data |
| `src/routes/api/analyze-public-v1.ts` | Creates `comment_enrichment_jobs` |
| `src/lib/admin/system-queries.server.ts` | Admin metrics for comment scraper |
| `src/server/admin/execution-mode.functions.ts` | `COMMENT_SCRAPER_ENABLED` toggle |

### What happens to Q05 "Conversa" if comment scraper is disabled?

**Q05 already works WITHOUT comment_intelligence.** The `classifyAudienceResponse()` function (block02-diagnostic.ts line 512) uses only post-level data (likes, comments counts) from the main Instagram scraper. It produces:
- `avgLikes`, `avgComments`, `commentsToLikesPct`
- `topConversationPost` (post with most comments)
- `topCommentPosts` (ranked list)
- status classification: `active` / `moderate` / `silent`

When `commentIntel` is `null` or `!available`, the card shows a `CommentIntelligenceUnavailable` fallback with a dashed border message. The card still renders with all post-level audience metrics.

### What we LOSE without the comment scraper:
- Actual comment text (sample comments)
- Audience sentiment / intent analysis
- Real audience voice / questions
- Owner reply rate and patterns
- Conversation quality beyond counts

### What we KEEP (from instagram-scraper):
- Comment count per post
- Likes per post
- Posts with most comments (ranked)
- Engagement per post
- Permalink, caption, format, date
- Comments-to-likes ratio
- Caption CTA detection (from caption-semantic-analysis)

---

## 4. Can the Main Scraper Replace Part of the Comment Block?

**Yes, partially.** The profile/posts scraper returns all post-level metrics needed for a lighter P05:

A lighter P05 could include:
- "Posts que geram mais comentários" (top comment posts -- already computed)
- "Rácio de conversa" (comments/likes -- already computed)
- "Presença de CTAs nas legendas" (from caption-semantic-analysis)
- "Classificação do público: ativo / moderado / silencioso" (already computed)

This is already the current fallback state when `commentIntel` is null. The UI gracefully degrades.

---

## 5. Product Decision Recommendation

### Recommended: Option D (Top-N posts only), with Option B as interim

**Phase 1 (immediate, low-risk):** Reduce `COMMENT_SCRAPER_MAX_POSTS` from 12 to 3-5. This directly reduces cost since comment scraping is priced by post count. The martimsilvai $0.20 run likely scraped 12 posts; limiting to 3 would cut cost to ~$0.05.

**Phase 2 (if Phase 1 is still too expensive):** Disable comment scraper entirely via `COMMENT_SCRAPER_ENABLED=false`. Q05 already has a working fallback using post-level metrics only.

**Phase 3 (future):** Make comment scraper conditional on report tier (Pro/Agency) or user payment.

### Why not Option A (keep as-is)?
At $0.08-$0.20 per run, comment scraping alone can exceed the entire rest of the report cost. For an MVP in testing phase with no revenue, this is unsustainable.

---

## 6. Implementation Plan (not to execute yet)

### Phase 1: Reduce max posts (safest change)

**File to change:** Environment variable `COMMENT_SCRAPER_MAX_POSTS` (currently defaults to 12)
- Set to `3` or `5` via secrets/env
- No code change needed -- `src/lib/analysis/comment-scraper.server.ts` line 64 already reads from env

**Files NOT to touch:** All UI components, report blocks, admin, PDF, cost logic.

### Phase 2: Full disable (if needed)

**File to change:** `COMMENT_SCRAPER_ENABLED` secret (already exists, already a kill switch)
- Set to `false`

**Files to optionally update:**
- `src/components/report-redesign/v2/report-comment-intelligence.tsx` -- improve the "unavailable" fallback copy to say "Análise de comentários disponível em relatórios Pro" instead of current dashed-border message
- `src/lib/analysis/cache.ts` -- ensure `enrichment_status.comments` is set to `"disabled"` (not `"error"`) when the flag is off

**Files NOT to touch:** block02-diagnostic.ts, report-diagnostic-block.tsx, snapshot-to-report-data.ts, any admin or cost files, PDF pipeline.

**Rollback:** Set `COMMENT_SCRAPER_ENABLED=true` and/or `COMMENT_SCRAPER_MAX_POSTS=12` to restore original behavior.

**Cached reports:** Unaffected. Existing `comment_intelligence` in `normalized_payload` remains and renders normally.

---

## 7. Readiness Assessment

| Check | Status |
|-------|--------|
| Comment scraper is most expensive actor | **CONFIRMED** (55% of total spend) |
| Q05 works without comment data | **PASS** (graceful fallback exists) |
| Kill switch exists | **PASS** (`COMMENT_SCRAPER_ENABLED`) |
| Max posts is configurable via env | **PASS** (`COMMENT_SCRAPER_MAX_POSTS`) |
| Cached reports unaffected | **PASS** (data persists in `normalized_payload`) |
| No code changes required for Phase 1 | **PASS** (env-only) |
| Enrichment status tracking | **PASS** (`set_enrichment_status` function exists) |

**Overall: PASS -- safe to proceed with Phase 1 (reduce max posts) immediately via env config.**

---

### Recommended Next Prompts (one at a time)

1. "Reduzir `COMMENT_SCRAPER_MAX_POSTS` de 12 para 3 via variável de ambiente."
2. "Testar relatório fresco para frederico.m.carvalho e verificar custo do comment scraper com limite de 3 posts."
3. (If cost still too high) "Desativar comment scraper via `COMMENT_SCRAPER_ENABLED=false` e melhorar fallback copy no P05."
4. (Future) "Tornar comment scraper condicional por tipo de relatório (Free vs Pro)."
