## Plan — PR2 finish: persist `analysis_window` on `analysis_events`

### Migration
**Name:** `add_analysis_window_to_analysis_events`

```sql
-- 1. Column (nullable, free-text guarded by CHECK)
ALTER TABLE public.analysis_events
  ADD COLUMN IF NOT EXISTS analysis_window text;

ALTER TABLE public.analysis_events
  ADD CONSTRAINT analysis_events_analysis_window_check
  CHECK (analysis_window IS NULL OR analysis_window IN ('baseline','30d','90d'));

CREATE INDEX IF NOT EXISTS idx_analysis_events_analysis_window
  ON public.analysis_events (analysis_window)
  WHERE analysis_window IS NOT NULL;

-- 2. Extend the writer RPC with a new optional param (default NULL)
CREATE OR REPLACE FUNCTION public.record_analysis_event(
  p_network text, p_handle text, p_competitor_handles jsonb,
  p_cache_key text, p_data_source text, p_outcome text,
  p_error_code text, p_analysis_snapshot_id uuid, p_provider_call_log_id uuid,
  p_posts_returned integer, p_profiles_returned integer,
  p_estimated_cost_usd numeric, p_duration_ms integer,
  p_request_ip_hash text, p_user_agent_family text,
  p_display_name text DEFAULT NULL,
  p_followers_last_seen bigint DEFAULT NULL,
  p_analysis_window text DEFAULT NULL  -- NEW (trailing, optional)
) RETURNS uuid ...
-- body: identical to current function, plus `analysis_window` in the
-- INSERT INTO public.analysis_events column list/values.
-- social_profiles upsert unchanged.

-- 3. Safe backfill (only NULL rows)
UPDATE public.analysis_events
SET analysis_window = CASE
  WHEN cache_key LIKE '%:w=30d' THEN '30d'
  WHEN cache_key LIKE '%:w=90d' THEN '90d'
  ELSE 'baseline'
END
WHERE analysis_window IS NULL;
```

No GRANT changes (column added to existing table; RPC already has correct grants).

### Files changed
- **NEW migration** as above.
- `src/lib/analysis/events.ts`
  - Extend `RecordAnalysisEventInput` with `analysisWindow?: 'baseline' | '30d' | '90d' | null`.
  - Add `p_analysis_window: input.analysisWindow ?? null` to the RPC args.
- `src/routes/api/analyze-public-v1.ts`
  - Extend the inner `logEvent` helper's `overrides` type with `analysisWindow?: 'baseline' | '30d' | '90d' | null`.
  - Pass `analysisWindow: windowKind` on every `logEvent({...})` call that runs **after** `windowKind` is computed (line 476): cache hit, `WINDOW_REQUIRES_PRO` block, insufficient-credits block, fresh success, provider-error / not-found, allowlist / provider-disabled blocks.
  - Pre-parse `invalid_input` events (lines 454 & 466) leave `analysisWindow` unset (null) — window is not known yet; spec explicitly lists only post-parse outcomes.
- `src/integrations/supabase/types.ts` — auto-regenerated after migration approval. No manual edit.
- **Tests** — new `src/routes/api/__tests__/analyze-public-v1-window-event.test.ts` (or extend an existing test if a Vitest harness already mocks `recordAnalysisEvent`). Asserts:
  - baseline request → `recordAnalysisEvent` called with `analysisWindow: 'baseline'`.
  - 30d request (Pro lead) → `analysisWindow: '30d'`.
  - 30d request without Pro entitlement → block path also records `analysisWindow: '30d'` with `outcome: 'blocked_credits'` and `errorCode: 'WINDOW_REQUIRES_PRO'`.

### Backfill logic
Single `UPDATE` inside the same migration, gated by `WHERE analysis_window IS NULL`. Uses `cache_key LIKE '%:w=30d'` / `:w=90d` suffix produced by `buildCacheKey`; all other historical rows resolve to `'baseline'`. Idempotent — re-running is a no-op.

### Out of scope (untouched)
- No changes to credit ledger, entitlements, pricing, EuPago, checkout, free/public gating, or the period selector UI.
- No changes to provider call code paths or cost computation.
- `cache_key` is no longer parsed at runtime; the column is the source of truth from the next deploy forward.

### Return on completion
- Migration name.
- Files modified.
- Confirmation that credit/provider/payment code is untouched (diff scoped to events.ts + analyze-public-v1.ts logEvent call sites).
- Test results from `bunx vitest run` for the new spec.