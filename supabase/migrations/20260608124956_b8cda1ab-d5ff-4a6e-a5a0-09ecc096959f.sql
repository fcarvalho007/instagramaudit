-- 1. Column
ALTER TABLE public.analysis_events
  ADD COLUMN IF NOT EXISTS analysis_window text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'analysis_events_analysis_window_check'
  ) THEN
    ALTER TABLE public.analysis_events
      ADD CONSTRAINT analysis_events_analysis_window_check
      CHECK (analysis_window IS NULL OR analysis_window IN ('baseline','30d','90d'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_analysis_events_analysis_window
  ON public.analysis_events (analysis_window)
  WHERE analysis_window IS NOT NULL;

-- 2. Extend the writer RPC with optional p_analysis_window
CREATE OR REPLACE FUNCTION public.record_analysis_event(
  p_network text,
  p_handle text,
  p_competitor_handles jsonb,
  p_cache_key text,
  p_data_source text,
  p_outcome text,
  p_error_code text,
  p_analysis_snapshot_id uuid,
  p_provider_call_log_id uuid,
  p_posts_returned integer,
  p_profiles_returned integer,
  p_estimated_cost_usd numeric,
  p_duration_ms integer,
  p_request_ip_hash text,
  p_user_agent_family text,
  p_display_name text DEFAULT NULL,
  p_followers_last_seen bigint DEFAULT NULL,
  p_analysis_window text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_event_id uuid;
  v_handle text := lower(p_handle);
  v_network text := lower(p_network);
  v_is_cache boolean := p_data_source = 'cache';
  v_is_stale boolean := p_data_source = 'stale';
  v_is_fresh_success boolean := p_data_source = 'fresh' AND p_outcome = 'success';
  v_is_blocked boolean := p_outcome IN ('blocked_allowlist', 'provider_disabled');
  v_is_failure boolean := p_outcome IN ('provider_error', 'not_found', 'invalid_input');
  v_cost_delta numeric := COALESCE(p_estimated_cost_usd, 0);
BEGIN
  INSERT INTO public.analysis_events (
    network, handle, competitor_handles, cache_key, data_source, outcome,
    error_code, analysis_snapshot_id, provider_call_log_id, posts_returned,
    profiles_returned, estimated_cost_usd, duration_ms, request_ip_hash,
    user_agent_family, analysis_window
  ) VALUES (
    v_network, v_handle, COALESCE(p_competitor_handles, '[]'::jsonb),
    p_cache_key, p_data_source, p_outcome, p_error_code, p_analysis_snapshot_id,
    p_provider_call_log_id, p_posts_returned, p_profiles_returned,
    p_estimated_cost_usd, p_duration_ms, p_request_ip_hash, p_user_agent_family,
    p_analysis_window
  ) RETURNING id INTO v_event_id;

  INSERT INTO public.social_profiles (
    network, handle, display_name, followers_last_seen, last_outcome,
    last_data_source, last_snapshot_id, analyses_total, analyses_fresh,
    analyses_cache, analyses_stale, analyses_blocked, analyses_failed,
    estimated_cost_usd_total
  ) VALUES (
    v_network, v_handle, p_display_name, p_followers_last_seen, p_outcome,
    p_data_source, p_analysis_snapshot_id,
    1,
    CASE WHEN v_is_fresh_success THEN 1 ELSE 0 END,
    CASE WHEN v_is_cache THEN 1 ELSE 0 END,
    CASE WHEN v_is_stale THEN 1 ELSE 0 END,
    CASE WHEN v_is_blocked THEN 1 ELSE 0 END,
    CASE WHEN v_is_failure THEN 1 ELSE 0 END,
    CASE WHEN v_is_fresh_success THEN v_cost_delta ELSE 0 END
  )
  ON CONFLICT (network, handle) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, public.social_profiles.display_name),
    followers_last_seen = COALESCE(EXCLUDED.followers_last_seen, public.social_profiles.followers_last_seen),
    last_analyzed_at = now(),
    last_outcome = EXCLUDED.last_outcome,
    last_data_source = EXCLUDED.last_data_source,
    last_snapshot_id = COALESCE(EXCLUDED.last_snapshot_id, public.social_profiles.last_snapshot_id),
    analyses_total = public.social_profiles.analyses_total + 1,
    analyses_fresh = public.social_profiles.analyses_fresh + CASE WHEN v_is_fresh_success THEN 1 ELSE 0 END,
    analyses_cache = public.social_profiles.analyses_cache + CASE WHEN v_is_cache THEN 1 ELSE 0 END,
    analyses_stale = public.social_profiles.analyses_stale + CASE WHEN v_is_stale THEN 1 ELSE 0 END,
    analyses_blocked = public.social_profiles.analyses_blocked + CASE WHEN v_is_blocked THEN 1 ELSE 0 END,
    analyses_failed = public.social_profiles.analyses_failed + CASE WHEN v_is_failure THEN 1 ELSE 0 END,
    estimated_cost_usd_total = public.social_profiles.estimated_cost_usd_total + CASE WHEN v_is_fresh_success THEN v_cost_delta ELSE 0 END,
    updated_at = now();

  RETURN v_event_id;
END;
$function$;

-- 3. Backfill
UPDATE public.analysis_events
SET analysis_window = CASE
  WHEN cache_key LIKE '%:w=30d' THEN '30d'
  WHEN cache_key LIKE '%:w=90d' THEN '90d'
  ELSE 'baseline'
END
WHERE analysis_window IS NULL;