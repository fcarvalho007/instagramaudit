-- 1) Granular counters on social_profiles (additive, default 0).
ALTER TABLE public.social_profiles
  ADD COLUMN IF NOT EXISTS analyses_stale integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS analyses_blocked integer NOT NULL DEFAULT 0;

-- 2) Indexes for cockpit queries.
CREATE INDEX IF NOT EXISTS analysis_events_created_at_idx
  ON public.analysis_events (created_at DESC);
CREATE INDEX IF NOT EXISTS analysis_events_handle_idx
  ON public.analysis_events (handle);
CREATE INDEX IF NOT EXISTS analysis_events_outcome_idx
  ON public.analysis_events (outcome);
CREATE INDEX IF NOT EXISTS analysis_events_data_source_idx
  ON public.analysis_events (data_source);
CREATE INDEX IF NOT EXISTS analysis_events_snapshot_idx
  ON public.analysis_events (analysis_snapshot_id);

CREATE INDEX IF NOT EXISTS social_profiles_last_analyzed_idx
  ON public.social_profiles (last_analyzed_at DESC);
CREATE INDEX IF NOT EXISTS social_profiles_total_idx
  ON public.social_profiles (analyses_total DESC);
CREATE INDEX IF NOT EXISTS social_profiles_cost_idx
  ON public.social_profiles (estimated_cost_usd_total DESC);

-- 3) Refine record_analysis_event to populate the new buckets without
--    changing the function signature (no TS callers need to change).
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
  p_followers_last_seen bigint DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    user_agent_family
  ) VALUES (
    v_network, v_handle, COALESCE(p_competitor_handles, '[]'::jsonb),
    p_cache_key, p_data_source, p_outcome, p_error_code, p_analysis_snapshot_id,
    p_provider_call_log_id, p_posts_returned, p_profiles_returned,
    p_estimated_cost_usd, p_duration_ms, p_request_ip_hash, p_user_agent_family
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