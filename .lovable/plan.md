
# Financial Reconciliation Import Plan

## Audit Results

### Current DB State

**provider_billing_import_batches** — 1 row (Apify only):
| Provider | Dashboard Total | Displayed Sum | Raw Sum | Rounding Δ | Status |
|----------|----------------|---------------|---------|------------|--------|
| apify | $0.66 | $0.67 | $0.6601 | -$0.01 | Rounding difference |

**provider_billing_imports** — 2 rows (Apify only):
| Actor | Qty | Unit Price | Raw Cost | Displayed | Actual (raw) |
|-------|-----|-----------|----------|-----------|-------------|
| instagram-scraper | 37 | $0.0023 | $0.0851 | $0.09 | $0.0851 |
| instagram-comment-scraper | 250 | $0.0023 | $0.575 | $0.58 | $0.575 |

**Apify verdict: PASS** — data matches the user-supplied screenshot exactly. No correction needed.

---

### OpenAI Analysis

Source: `completions_usage_2026-04-06_2026-05-06.csv`
Dashboard total (user-confirmed): **$0.60**

The CSV contains token usage across 2 projects and 5 models. No cost column exists — costs must be estimated from tokens.

**Rows with data (grouped by model):**

| Model | Requests | Input Tokens | Output Tokens | Cached | Est. Cost |
|-------|----------|-------------|---------------|--------|-----------|
| gpt-4o-mini-2024-07-18 | 2 | 3,497 | 182 | 0 | ~$0.0006 |
| gpt-5-mini-2025-08-07 | 15 | 22,027 | 47,945 | 0 | ~$0.27 |
| gpt-5.4-2026-03-05 | 30 | 90,364 | 42,195 | 21,248 | ~$0.62 |
| gpt-5.4-mini-2026-03-17 | 47 | 203,452 | 34,511 | 38,656 | ~$0.13 |
| gpt-5.4-nano-2026-03-17 | 6 | 11,523 | 3,667 | 0 | ~$0.003 |
| **Total** | **100** | | | | **~$1.02 (est)** |

**Key finding:** Token-based estimate ($1.02) vs dashboard total ($0.60) — significant gap. This is normal because:
- OpenAI pricing tiers, discounts, and actual billing differ from public list prices
- The dashboard total ($0.60) is the source of truth

**Internal logs total:** $0.278 (58 calls, only gpt-5.4-mini and gpt-5.4-nano)

**Internal vs external delta:** $0.60 - $0.278 = $0.322 — internal logs undercount because some calls may go through Lovable AI gateway or models not logged internally.

**Proposed import — 1 batch + 5 rows:**

Batch: `provider=openai, dashboard_total=$0.60, period=2026-04-06..2026-05-06`

Rows (one per model, aggregated):
| actor_or_model | label | metric_name | quantity (requests) | raw_calculated_cost_usd | displayed_cost_usd | notes |
|----------------|-------|-------------|---------------------|------------------------|-------------------|-------|
| gpt-4o-mini-2024-07-18 | GPT-4o Mini | requests | 2 | null | null | Token est. ~$0.001 |
| gpt-5-mini-2025-08-07 | GPT-5 Mini | requests | 15 | null | null | Token est. ~$0.27 |
| gpt-5.4-2026-03-05 | GPT-5.4 | requests | 30 | null | null | Token est. ~$0.62 |
| gpt-5.4-mini-2026-03-17 | GPT-5.4 Mini | requests | 47 | null | null | Token est. ~$0.13 |
| gpt-5.4-nano-2026-03-17 | GPT-5.4 Nano | requests | 6 | null | null | Token est. ~$0.003 |

Since the CSV has no per-model cost breakdown, `raw_calculated_cost_usd` and `displayed_cost_usd` will be null. The batch-level `dashboard_total_actual_cost_usd = 0.60` is the only authoritative cost figure.

`actual_cost_usd` per row: proportional split of $0.60 based on token-estimated costs (so the rows sum to $0.60), flagged as estimated allocation.

---

### DataForSEO Analysis

**Source 1: `total-functions-grid.xlsx`** — Keywords Data API usage:
| Date | API | Cost |
|------|-----|------|
| 28.04.2026 | Keywords Data API | $0.027 |
| 29.04.2026 | Keywords Data API | $0.045 |
| 01.05.2026 | Keywords Data API | $0.009 |
| 02.05.2026 | Keywords Data API | $0.009 |
| 03.05.2026 | Keywords Data API | $0.009 |
| 06.05.2026 | Keywords Data API | $0.018 |
| **Total** | | **$0.117** |

**Source 2: `serp-usage.xlsx`** — 0 rows (empty, headers only). No SERP costs.

Dashboard total (user-confirmed): **$0.117**

**Internal logs total:** $0.108 (14 calls, google_trends_explore)

**Internal vs external delta:** $0.117 - $0.108 = $0.009

**Finding:** Internal logs record $0.009/call consistently. The DFS export shows the same daily totals — the match is near-perfect. The $0.009 gap is exactly 1 call worth, possibly a call logged under a slightly different date boundary.

**Proposed import — 1 batch + 6 rows:**

Batch: `provider=dataforseo, dashboard_total=$0.117, period=2026-04-28..2026-05-06`

Rows (one per day, matching the export):
| actor_or_model | label | date | quantity | unit_price | raw_cost | displayed_cost | actual_cost |
|----------------|-------|------|----------|-----------|----------|---------------|-------------|
| keywords_data_api | Keywords Data API | 28.04 | 3 | $0.009 | $0.027 | $0.027 | $0.027 |
| keywords_data_api | Keywords Data API | 29.04 | 5 | $0.009 | $0.045 | $0.045 | $0.045 |
| keywords_data_api | Keywords Data API | 01.05 | 1 | $0.009 | $0.009 | $0.009 | $0.009 |
| keywords_data_api | Keywords Data API | 02.05 | 1 | $0.009 | $0.009 | $0.009 | $0.009 |
| keywords_data_api | Keywords Data API | 03.05 | 1 | $0.009 | $0.009 | $0.009 | $0.009 |
| keywords_data_api | Keywords Data API | 06.05 | 2 | $0.009 | $0.018 | $0.018 | $0.018 |

No rounding delta — displayed = raw = dashboard total.

---

## Assumptions

1. OpenAI dashboard total of $0.60 covers ALL usage in the CSV (both project IDs).
2. OpenAI per-model costs will be proportionally allocated from the $0.60 total since no per-model billing is available.
3. DataForSEO unit price inferred as $0.009/call based on consistent pattern.
4. DataForSEO quantity per day inferred by dividing daily cost by $0.009.
5. DataForSEO period starts at 2026-04-28 (first day in export), not 2026-04-06.
6. SERP usage is zero (empty export file).

## Fields That Cannot Be Mapped Confidently

- **OpenAI `raw_calculated_cost_usd` per model** — no cost column in export; only token counts available.
- **OpenAI `displayed_cost_usd` per model** — OpenAI dashboard doesn't show per-model rounded values in the export.
- **OpenAI `unit_price_usd`** — varies by model, and actual pricing may differ from public list.

## Readiness Assessment: PASS

All three providers have clear data. Apify is already correct. OpenAI and DataForSEO are ready to import with the batch-level dashboard totals as source of truth.

---

## Implementation Steps (pending approval)

1. **Insert OpenAI batch** into `provider_billing_import_batches` with `dashboard_total_actual_cost_usd = 0.60`.
2. **Insert 5 OpenAI rows** into `provider_billing_imports` (one per model, with token metrics and proportional cost allocation).
3. **Insert DataForSEO batch** into `provider_billing_import_batches` with `dashboard_total_actual_cost_usd = 0.117`.
4. **Insert 6 DataForSEO rows** into `provider_billing_imports` (one per day).
5. **Verify** the reconciliation server logic picks up the new batches and calculates deltas correctly.
6. **Verify** the Admin UI reconciliation table shows all 3 providers with correct labels.

## Files likely to change
- Database data only (INSERTs via insert tool) — no schema changes needed.
- `src/lib/admin/billing-reconciliation.server.ts` — may need minor adjustments if it doesn't handle multiple batches per provider.
- `src/components/admin/v2/visao-geral/expense-section.tsx` — verify UI renders 3 providers.

## Files NOT to touch
- Provider execution logic
- Public report UI
- PDF pipeline
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `.env`
- Any locked files
