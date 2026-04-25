CREATE TABLE public.social_profiles (network text NOT NULL, handle text NOT NULL, display_name text, followers_last_seen bigint, first_analyzed_at timestamptz NOT NULL DEFAULT now(), last_analyzed_at timestamptz NOT NULL DEFAULT now(), last_outcome text, last_data_source text, last_snapshot_id uuid, analyses_total integer NOT NULL DEFAULT 0, analyses_fresh integer NOT NULL DEFAULT 0, analyses_cache integer NOT NULL DEFAULT 0, analyses_failed integer NOT NULL DEFAULT 0, estimated_cost_usd_total numeric(12,5) NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (network, handle));
CREATE INDEX idx_social_profiles_last_analyzed ON public.social_profiles (last_analyzed_at DESC);
CREATE INDEX idx_social_profiles_total ON public.social_profiles (analyses_total DESC);
CREATE INDEX idx_social_profiles_cost ON public.social_profiles (estimated_cost_usd_total DESC);
ALTER TABLE public.social_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER set_social_profiles_updated_at BEFORE UPDATE ON public.social_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.analysis_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), network text NOT NULL, handle text NOT NULL, competitor_handles jsonb NOT NULL DEFAULT '[]'::jsonb, cache_key text, data_source text NOT NULL, outcome text NOT NULL, error_code text, analysis_snapshot_id uuid, provider_call_log_id uuid, posts_returned integer, profiles_returned integer, estimated_cost_usd numeric(10,5), duration_ms integer, request_ip_hash text, user_agent_family text, billing_event_id uuid);
CREATE INDEX idx_analysis_events_created ON public.analysis_events (created_at DESC);
CREATE INDEX idx_analysis_events_handle ON public.analysis_events (network, handle, created_at DESC);
CREATE INDEX idx_analysis_events_outcome ON public.analysis_events (outcome, created_at DESC);
CREATE INDEX idx_analysis_events_data_source ON public.analysis_events (data_source, created_at DESC);
ALTER TABLE public.analysis_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.provider_call_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), provider text NOT NULL DEFAULT 'apify', actor text NOT NULL, network text NOT NULL, handle text NOT NULL, analysis_event_id uuid, apify_run_id text, status text NOT NULL, http_status integer, duration_ms integer, posts_returned integer NOT NULL DEFAULT 0, estimated_cost_usd numeric(10,5), actual_cost_usd numeric(10,5), error_excerpt text);
CREATE INDEX idx_provider_call_logs_created ON public.provider_call_logs (created_at DESC);
CREATE INDEX idx_provider_call_logs_actor ON public.provider_call_logs (actor, created_at DESC);
CREATE INDEX idx_provider_call_logs_status ON public.provider_call_logs (status, created_at DESC);
CREATE INDEX idx_provider_call_logs_handle ON public.provider_call_logs (handle, created_at DESC);
ALTER TABLE public.provider_call_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.usage_alerts (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), severity text NOT NULL, kind text NOT NULL, network text, handle text, request_ip_hash text, window_start timestamptz NOT NULL, window_end timestamptz NOT NULL, metric_name text NOT NULL, metric_value numeric(12,5) NOT NULL, threshold_value numeric(12,5) NOT NULL, acknowledged_at timestamptz, notes text);
CREATE INDEX idx_usage_alerts_created ON public.usage_alerts (created_at DESC);
CREATE INDEX idx_usage_alerts_kind ON public.usage_alerts (kind, created_at DESC);
CREATE INDEX idx_usage_alerts_open ON public.usage_alerts (created_at DESC) WHERE acknowledged_at IS NULL;
ALTER TABLE public.usage_alerts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.record_analysis_event(p_network text, p_handle text, p_competitor_handles jsonb, p_cache_key text, p_data_source text, p_outcome text, p_error_code text, p_analysis_snapshot_id uuid, p_provider_call_log_id uuid, p_posts_returned integer, p_profiles_returned integer, p_estimated_cost_usd numeric, p_duration_ms integer, p_request_ip_hash text, p_user_agent_family text, p_display_name text DEFAULT NULL, p_followers_last_seen bigint DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_event_id uuid;
  v_handle text := lower(p_handle);
  v_network text := lower(p_network);
  v_is_cache boolean := p_data_source IN ('cache', 'stale');
  v_is_fresh_success boolean := p_data_source = 'fresh' AND p_outcome = 'success';
  v_is_failure boolean := p_outcome IN ('provider_error', 'not_found', 'blocked_allowlist', 'provider_disabled', 'invalid_input');
  v_cost_delta numeric := COALESCE(p_estimated_cost_usd, 0);
BEGIN
  INSERT INTO public.analysis_events (network, handle, competitor_handles, cache_key, data_source, outcome, error_code, analysis_snapshot_id, provider_call_log_id, posts_returned, profiles_returned, estimated_cost_usd, duration_ms, request_ip_hash, user_agent_family) VALUES (v_network, v_handle, COALESCE(p_competitor_handles, '[]'::jsonb), p_cache_key, p_data_source, p_outcome, p_error_code, p_analysis_snapshot_id, p_provider_call_log_id, p_posts_returned, p_profiles_returned, p_estimated_cost_usd, p_duration_ms, p_request_ip_hash, p_user_agent_family) RETURNING id INTO v_event_id;

  INSERT INTO public.social_profiles (network, handle, display_name, followers_last_seen, last_outcome, last_data_source, last_snapshot_id, analyses_total, analyses_fresh, analyses_cache, analyses_failed, estimated_cost_usd_total) VALUES (v_network, v_handle, p_display_name, p_followers_last_seen, p_outcome, p_data_source, p_analysis_snapshot_id, 1, CASE WHEN v_is_fresh_success THEN 1 ELSE 0 END, CASE WHEN v_is_cache THEN 1 ELSE 0 END, CASE WHEN v_is_failure THEN 1 ELSE 0 END, CASE WHEN v_is_fresh_success THEN v_cost_delta ELSE 0 END) ON CONFLICT (network, handle) DO UPDATE SET display_name = COALESCE(EXCLUDED.display_name, public.social_profiles.display_name), followers_last_seen = COALESCE(EXCLUDED.followers_last_seen, public.social_profiles.followers_last_seen), last_analyzed_at = now(), last_outcome = EXCLUDED.last_outcome, last_data_source = EXCLUDED.last_data_source, last_snapshot_id = COALESCE(EXCLUDED.last_snapshot_id, public.social_profiles.last_snapshot_id), analyses_total = public.social_profiles.analyses_total + 1, analyses_fresh = public.social_profiles.analyses_fresh + CASE WHEN v_is_fresh_success THEN 1 ELSE 0 END, analyses_cache = public.social_profiles.analyses_cache + CASE WHEN v_is_cache THEN 1 ELSE 0 END, analyses_failed = public.social_profiles.analyses_failed + CASE WHEN v_is_failure THEN 1 ELSE 0 END, estimated_cost_usd_total = public.social_profiles.estimated_cost_usd_total + CASE WHEN v_is_fresh_success THEN v_cost_delta ELSE 0 END, updated_at = now();

  RETURN v_event_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.record_analysis_event(text, text, jsonb, text, text, text, text, uuid, uuid, integer, integer, numeric, integer, text, text, text, bigint) FROM PUBLIC;