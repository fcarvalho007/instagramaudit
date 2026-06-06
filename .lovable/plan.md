# Free/Pro/Lab Enrichment Gate — Finalization

## Status before this turn

The bulk of the gate already shipped in the prior session:

- `FREE_ENRICHMENT_TYPES` (`[]`) and `PAID_ENRICHMENT_TYPES` exist in `src/lib/enrichment/types.ts`.
- `buildFreeEnrichmentStatus()` pre-marks paid jobs as `skipped` in the snapshot.
- `src/routes/api/analyze-public-v1.ts` enqueues only `FREE_ENRICHMENT_TYPES` and seeds `enrichment_status` via the Free builder.
- `src/lib/enrichment/enqueue-paid.server.ts` top-ups missing paid jobs idempotently on entitlement.
- `src/routes/api/public/eupago-webhook.ts` calls the top-up after successful payment.
- Internal Lab path (admin lab scrape) is unaffected and continues to run any/all enrichments today.

The dependency audit (previous turn) confirmed Free renders MethodologyLine + EngagementCardRefined + 5 PremiumTeaserCard only — no OpenAI/DFS/visual/caption needed.

This turn finishes the spec by adding: (1) an explicit `LAB_ENRICHMENT_TYPES` alias and (2) a clearer "skipped_free" status label so admin diagnostics distinguish "skipped for cost (Free tier)" from "skipped for budget".

## Changes

### 1. `src/lib/enrichment/types.ts`
- Extend `EnrichmentStatus` union to add `"skipped_free"` (kept distinct from `"skipped"`, which we will reserve for budget/runtime skips).
- Add `LAB_ENRICHMENT_TYPES = ALL_ENRICHMENT_TYPES` as a named alias used by lab callers (documentation + future-proofing).
- Update `buildFreeEnrichmentStatus()` to mark paid jobs as `"skipped_free"` instead of `"skipped"`.

### 2. `src/lib/enrichment/enqueue-paid.server.ts`
- Update the top-up filter (`enqueuePaidEnrichmentsForSnapshot`, line 54) to treat **both** `"skipped"` and `"skipped_free"` as "ready to be re-enqueued on Pro unlock". Otherwise Pro unlock would silently never enqueue jobs marked `skipped_free`.

### 3. `src/lib/admin/execution-mode.functions.ts` (line 91)
- Update the "completed" predicate to count `"skipped"`, `"skipped_free"`, and `"success"` as terminal so admin "execution mode" badge remains correct for Free snapshots.

### 4. `src/routes/api/admin/analysis-cost-breakdown.ts` (line 144)
- Same change: treat `"skipped_free"` as a terminal state alongside `"skipped"` / `"success"` so the cost-breakdown completion check still passes for Free.

### 5. `src/routes/api/__tests__/analyze-public-v1-credit-gate.test.ts`
- Re-export `LAB_ENRICHMENT_TYPES: []` in the mock so the import-protection doesn't trip.

### Not changed
- No DB schema change (enrichment_status is a free-form JSON map; adding a new string value is non-breaking).
- No prompts, prices, EuPago flow, credits, entitlements, payments, or report calculations.
- No UI change. The new status string is admin-only.
- `run-enrichment.server.ts` does not branch on `"skipped"`, so it is untouched.

## Final policy table

| Tier | Apify | dataforseo | insights_v1 | insights_v2 | visual_cover | caption_semantic | comments |
|---|---|---|---|---|---|---|---|
| **Free / Public** | run | skipped_free | skipped_free | skipped_free | skipped_free | skipped_free | gated by `COMMENT_SCRAPER_ENABLED` |
| **Pro (after entitlement)** | reuse snapshot | enqueue | enqueue | enqueue | enqueue | enqueue | gated |
| **Internal Lab** | run | run | run | run | run | run | run |

**Skipped in Free:** dataforseo, insights_v1, insights_v2, visual_cover, caption_semantic.
**Deferred to Pro:** the same five, enqueued idempotently by the EuPago webhook.
**Kept in Lab:** all of the above (`LAB_ENRICHMENT_TYPES`).

## Estimated saving per Free analysis

Order-of-magnitude (using current provider unit costs in `provider_call_logs`):

| Job | Typical cost per analysis |
|---|---|
| dataforseo (SERP + keywords) | ~$0.005–$0.020 |
| insights_v1 (OpenAI) | ~$0.005–$0.015 |
| insights_v2 (OpenAI) | ~$0.010–$0.030 |
| visual_cover (OpenAI vision, per cover) | ~$0.020–$0.080 |
| caption_semantic (OpenAI) | ~$0.005–$0.015 |
| **Total skipped on Free** | **~$0.045–$0.160** per analysis |

Apify base scrape (~$0.01–$0.04) remains. Effective Free cost drops by roughly **70–85%**.

## Manual validation checklist

1. Trigger a fresh public analysis for a new handle (clear cache). Expect:
   - `analysis_snapshots.normalized_payload.enrichment_status` shows the 5 paid jobs as `"skipped_free"`.
   - `enrichment_jobs` table has **no rows** for `dataforseo / insights_v1 / insights_v2 / visual_cover / caption_semantic` for that snapshot.
   - `/analyze/$username` renders MethodologyLine + Engagement + 5 teasers; no console errors.
2. Trigger a paid checkout for that snapshot and confirm EuPago webhook delivery.
   - Webhook logs `enqueuePaidEnrichmentsForPayment: enqueued [...]`.
   - `enrichment_jobs` now has the 5 paid rows pending → running → success.
   - Reload `/analyze/$username` after grants: full Pro report renders.
3. Internal Lab scrape (admin lab) is unchanged — verify cost breakdown still shows the lab analysis with all jobs.
4. No new errors in admin → Execution Mode and Cost Breakdown for Free snapshots (they correctly report "completed (Free tier)").
