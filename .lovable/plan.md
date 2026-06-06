## Audit only — no code changes

This is a read-only cost audit. No files modified, no providers touched.

---

## 1 · Executive summary

- **Free and Pro receive identical underlying data.** A cache miss on `/api/analyze-public-v1` always runs the full Apify scrape and fires all 5 async enrichment jobs (`dataforseo`, `insights_v1`, `insights_v2`, `visual_cover`, `caption_semantic`). The free vs Pro distinction is purely frontend gating via `ReportVariant` in `src/lib/report/report-variant.ts:60–77`.
- **Pro unlock triggers ZERO new provider calls.** `eupago-webhook.ts:155` only grants entitlement; the data was already paid for during the free analysis.
- **Period change (30d/90d) and "open lab preview" trigger ZERO provider calls** — pure frontend filter + DB read.
- **"Add competitor" triggers a FULL fresh cycle** (new `cache_key` → Apify + all enrichments).
- **Cache TTL: 24 h** (`CACHE_REUSE_MAX_MS` in `src/lib/report/retention.ts:71`).
- **Estimated waste per free analysis:** ~$0.04–0.07 in OpenAI + DFS enrichments invisible to free users (visual cover alone is ~$0.03).

## 2 · Cost incidence by trigger

| Trigger | Apify? | DFS? | OpenAI? | Cost |
|---|---|---|---|---|
| Handle submit (`/api/onboarding/start`) | ❌ | ❌ | ❌ | $0 |
| First free report view (`/analyze/$username` → analyze-public-v1) | ✅ 1 run | ✅ async | ✅ ×4 async | full cost |
| + each competitor | ✅ 1 extra run | – | – | +Apify per competitor |
| Cache hit < 24 h same cache_key | ❌ | ❌ | ❌ | $0 |
| Pro unlock (EuPago webhook) | ❌ | ❌ | ❌ | $0 |
| Period 30d/90d change | ❌ | ❌ | ❌ | $0 |
| Add competitor | ✅ new cycle | ✅ | ✅ | full cost again |
| Admin lab preview | ❌ | ❌ | ❌ | $0 (reads existing snapshot) |
| Admin force-refresh | ✅ | ✅ | ✅ | full cost, bypasses TTL |

## 3 · Provider cost table

| Provider | Function/file | Free | Pro | Lab | Unit cost | Per report | Skip in free? | Notes |
|---|---|---|---|---|---|---|---|---|
| Apify `apify/instagram-scraper` | `analyze-public-v1.ts:109,241` | ✅ | ✅ (cached) | ✅ (cached) | ~$0.005 profile + $0.0005/post | ~$0.011 (1 profile + 12 posts) | ❌ (needed for both free cards) | hard cap `maxTotalChargeUsd:0.10` |
| Apify `apify/instagram-comment-scraper` | `comment-scraper.server.ts:37` | ❌ | ❌ | feature-flag OFF | ~$0.0019/result | ~$0.15–0.20 when on | n/a | currently disabled |
| OpenAI insights_v1 | `openai-insights.server.ts:218` | ✅ async | ✅ | ✅ | gpt-5.4-mini | ~$0.002–0.004 | ⚠️ needed for `diagnosticQ01Q07` cards (visible in `public_mvp`) | fallback `editorial-verdict-fallback.ts` |
| OpenAI insights_v2 | `openai-insights.server.ts:~530` | ✅ async | ✅ | ✅ | gpt-5.4-mini | ~$0.003–0.006 | ✅ YES (not rendered in `public_mvp`) | prompt-hash cache hit if unchanged |
| OpenAI Visual Cover | `visual-cover-analysis.server.ts:107` | ✅ async | (lab only render) | ✅ | gpt-5.4-mini vision | ~$0.02–0.05 | ✅ YES (lab-only render) | biggest single waste in free |
| OpenAI Caption Semantic | `caption-semantic-analysis.server.ts` | ✅ async | partial | ✅ | gpt-5.4-mini | ~$0.003–0.008 | ✅ YES (lightweight render works without it) | |
| DataForSEO Google Trends | `dataforseo/endpoints/google-trends.ts:60` | ✅ async | ✅ | ✅ | DFS live | ~$0.001–0.005 | ✅ YES (`marketSignals:hidden` in `public_mvp`) | cached in snapshot |
| DataForSEO Keyword Ideas / SERP | `dataforseo/endpoints/{keyword-ideas,serp-organic}.ts` | not wired | not wired | not wired | n/a | $0 | n/a | dormant |
| Daily cap (OpenAI) | `openai-insights.server.ts:68` | shared | shared | shared | $5/day | – | – | once exceeded, all 4 OpenAI enrichments skip |

## 4 · Section → provider dependency map

| # | Section | Tier | Required raw fields | Provider | AI? | Renders from cache? |
|---|---|---|---|---|---|---|
| 01 | Visão geral | free | `profile.*`, `content_summary.*` | Apify only | No | ✅ |
| 02 | Engagement | free | `content_summary`, `posts[].{likes,comments,engagement_pct,format}`, `benchmark_positioning` (in-memory) | Apify only | No | ✅ |
| 03 | Frequência editorial | pro | `posts[].{taken_at_iso,format,is_pinned}`, `cadence` | Apify only | Optional (v2 copy) | ✅ |
| 04 | Mix de formatos | pro | `format_stats`, `posts[].format` | Apify only | Optional | ✅ |
| 05 | Publicações-chave | pro | `posts[].{thumbnail_url,likes,comments,caption,permalink,engagement_pct}` | Apify (+ storage bucket for thumbs) | Optional | ✅ |
| 06 | Diagnóstico editorial | pro | + `ai_insights_v1/v2`, `caption_semantic_analysis` | Apify + OpenAI | Yes (fallback exists) | ✅ |
| 07 | Prioridades de acção | pro | `ai_insights_v1.insights[]` | OpenAI v1 | Yes (fallback empty) | ✅ |

Note: in `public_mvp` the variant flags `diagnosticQ01Q07:"full"` and `conversationPostLevel:"full"` are TRUE, so the diagnostic cards consume `ai_insights_v1` even for free. That's why v1 can't be safely cut for free without UI degradation.

## 5 · Free generation cost breakdown

Per fresh free analysis (cache miss):
- Apify primary scrape: ~$0.011
- OpenAI insights_v1: ~$0.003 (used by visible diagnostic cards)
- OpenAI insights_v2: ~$0.005 — **invisible to free user**
- OpenAI visual cover: ~$0.03 — **invisible to free user**
- OpenAI caption semantic: ~$0.005 — **lightweight render works without it**
- DataForSEO Trends: ~$0.003 — **invisible (`marketSignals:hidden`)**
- **Total ≈ $0.057 per fresh free analysis.**
- **Waste (computed but invisible/lightweight-only) ≈ $0.043 (~75% of total cost).**

## 6 · Three architecture options

### Option 1 — Keep current
- Full upfront, free hides. Cost ~$0.057/free, $0 marginal on Pro upgrade. Instant Pro. Simplest. High waste at volume.

### Option 2 — Free-light (Apify only upfront, enrichments on Pro payment)
- Free ~$0.011. Pro adds ~$0.04–0.065 latency post-payment (5–25 s spinner). Requires webhook→enrichment trigger + snapshot-expiry handling + fallback copy for `diagnosticQ01Q07` cards in `public_mvp` (degrades visibly because they depend on v1).

### Option 3 — Hybrid (recommended) — IG metrics + v1 upfront, defer v2/vision/caption/DFS to Pro
- Free ~$0.014. Pro adds ~$0.025–0.050 on demand (but already computed if Pro upgrade happens — can be triggered async at payment with no perceived delay because v1 already shows in diagnostic).
- Visual cover stays lab-only (saves the biggest single line: ~$0.03/free).
- Insights_v1 kept for free (preserves current `public_mvp` UX).
- Low implementation risk: single gate inside `src/lib/enrichment/run-enrichment.server.ts:92–103`.

| | Free cost | Pro cost | Pro latency | Complexity | Risk | MVP fit |
|---|---|---|---|---|---|---|
| Opt 1 | ~$0.057 | $0 marginal | instant | none | low | OK now, painful at scale |
| Opt 2 | ~$0.011 | ~$0.04–0.07 deferred | 5–25 s post-payment | medium | medium (degrades free diag) | risky |
| Opt 3 | ~$0.014 | ~$0.025–0.050 deferred | near-instant | low-medium | low | ✅ best |

## 7 · Cost reduction recommendations

### Immediate (no risk, ~$0.04 saved per free)
1. **Gate `visual_cover` to internal/lab/Pro** — saves ~$0.03/free; UI never shows it in `public_mvp` or `pro_preview`.
2. **Gate `insights_v2` to Pro** — saves ~$0.005/free; not rendered in `public_mvp`.
3. **Gate `caption_semantic` to Pro** — saves ~$0.005/free; lightweight render works without it.
4. **Gate `dataforseo` to Pro/lab** — saves ~$0.003/free; `marketSignals:hidden` in `public_mvp`.

All four are toggled in one place: `src/lib/enrichment/run-enrichment.server.ts:92–103`. Requires knowing the lead's tier at enrichment-job creation (`analyze-public-v1.ts:~1178`) — derivable from `lead_id` → `entitlements` lookup or by storing a tier on the snapshot/event.

### Medium risk (defer to later sprint)
- Trigger deferred enrichments from EuPago webhook on Pro unlock, with a small "preparing your full report" UX if the user lands on Pro within ~10 s of payment.
- Cache TTL tuning (longer TTL for low-traffic handles).

### Avoid for now
- Splitting Apify into profile-only vs posts calls (no actor path; marginal saving).
- Deferring `insights_v1` for free (breaks `diagnosticQ01Q07` cards in `public_mvp`).
- Shortening cache TTL (would increase Apify spend).

## 8 · Final recommendation

- Current cost (~$0.057/free analysis) is **acceptable for current beta volume** but ~75% of it is waste. At ~200 free analyses/day this is ~$11/day, ~$330/month before any revenue event.
- **Optimise now — Option 3.** It's the cheapest change with the highest ROI: a single tier gate inside `run-enrichment.server.ts` saves ~$0.043/free with no UX regression on the two visible free cards (01 + 02) and no regression on `diagnosticQ01Q07` cards (kept via `insights_v1`).
- **Disable `visual_cover` for non-internal traffic first** — single highest-cost line, zero free/Pro UI dependency.

## 9 · Recommended next prompt (do NOT implement now)

> Add a tier gate to the enrichment runner so that `visual_cover`, `insights_v2`, `caption_semantic`, and `dataforseo` jobs only run when the snapshot's lead has a Pro entitlement OR the request came from an internal/admin/lab trigger. Keep `insights_v1` running for all tiers (needed for `diagnosticQ01Q07` cards in `public_mvp`).
>
> Files: `src/lib/enrichment/run-enrichment.server.ts` (single gate at lines 92–103), `src/routes/api/analyze-public-v1.ts:~1178` (compute & pass `leadTier` when enqueuing jobs), and `src/routes/api/public/eupago-webhook.ts` (trigger deferred enrichments after `grantEntitlement` for the lead's most recent snapshot).
>
> Constraints: do not change prices, EuPago, entitlements, credits, scraping, prompts, or DB schema beyond an optional `lead_tier` column on `enrichment_jobs`. Estimated saving: ~$0.04–0.05 per free analysis.

---

This is the audit deliverable. No code or providers changed. Ready to plan/implement the recommended next step on approval.