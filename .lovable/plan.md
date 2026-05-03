
# Per-Analysis Cost Breakdown in /admin

## Audit Results

### 1. Can we attribute provider calls to a specific analysis?

**Partially.** The `analysis_event_id` column exists on `provider_call_logs` but is **never populated** — all rows have `NULL`. Currently:

- `analysis_events.provider_call_log_id` links to **one** provider call (the base Apify scraper only)
- OpenAI insight calls (2 per analysis), DataForSEO calls, and comment scraper calls have **no link** to the analysis event
- Correlation by `handle + created_at` within a ~30s window works as a heuristic but is fragile and can't distinguish retries

### 2. What's missing?

**One field needs populating, not adding:** `provider_call_logs.analysis_event_id` (uuid, already in schema, always NULL). No migration needed — just code changes to pass the event ID through.

### 3. Comment scraper costs

The comment scraper actor (`apify/instagram-comment-scraper`) does not yet appear in `provider_call_logs` because `COMMENT_SCRAPER_ENABLED` has been off. The `enrich-comments-inline.server.ts` already calls `recordProviderCall` — once enabled, rows will appear. But they also won't have `analysis_event_id`.

---

## Plan

### Phase 1: Wire `analysis_event_id` into provider calls (no migration)

**Problem:** The analysis event is created at the END of the flow (after all provider calls), so provider_call_log rows are inserted before the event_id exists.

**Solution:** Two-pass approach:
1. Keep recording provider calls as-is (returning their IDs)
2. After `recordAnalysisEvent` returns the event ID, batch-update all collected provider call log IDs with that `analysis_event_id`
3. Add `analysisEventId` to `RecordProviderCallInput` for future calls that happen after the event is created

**Files changed:**
- `src/lib/analysis/events.ts` — add `updateProviderCallsEventId(logIds: string[], eventId: string)` helper
- `src/routes/api/analyze-public-v1.ts` — collect all provider call log IDs during the flow, call the new helper after `recordAnalysisEvent`
- `src/lib/analysis/enrich-comments-inline.server.ts` — accept and return the provider call log ID so the parent can include it
- `src/lib/insights/openai-insights.server.ts` — return provider call log IDs from insight generation

### Phase 2: Admin "Últimas análises" view

New component in `/admin` (Sistema or Visão Geral tab) showing:

| Coluna | Fonte |
|---|---|
| Username | `analysis_events.handle` |
| Timestamp | `analysis_events.created_at` |
| Cache/Fresh | `analysis_events.data_source` |
| Total cost | SUM of linked `provider_call_logs.estimated_cost_usd` |
| Apify base | PCL where `actor = 'apify/instagram-scraper'` |
| Comment scraper | PCL where `actor = 'apify/instagram-comment-scraper'` |
| OpenAI/AI | PCL where `provider = 'openai'` |
| DataForSEO | PCL where `provider = 'dataforseo'` |
| Provider calls | COUNT of linked PCL rows |
| Comment status | from snapshot `comment_intelligence.available` / `reason` |
| Actual cost available? | whether `actual_cost_usd IS NOT NULL` on any PCL |

**Expandable detail row** per analysis showing individual provider calls.

**Warning badges:**
- Red: comment scraper cost > $0.20
- Amber: cost is NULL/estimated only
- Amber: total analysis cost above expected threshold (~$0.05 without comments, ~$0.20 with)

**Files:**
- New: `src/components/admin/v2/sistema/analysis-cost-breakdown.tsx`
- New: `src/server/admin/analysis-cost.functions.ts` + `src/server/admin/analysis-cost.server.ts`
- Edit: the Sistema tab route to include the new section

### Phase 3: Backfill existing data (best-effort)

A one-time server function or admin button that correlates existing `provider_call_logs` rows to `analysis_events` by matching `handle + created_at` within ±30s. This populates `analysis_event_id` for historical data.

### Privacy

- Zero raw comments, commenter usernames, or PII
- Only aggregated costs, counts, and status flags

### Validation

- `bunx tsc --noEmit`
- `bunx vitest run`
- Visual check in /admin
