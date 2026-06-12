REVOKE EXECUTE ON FUNCTION public.record_analysis_event(
  p_network text, p_handle text, p_competitor_handles jsonb, p_cache_key text,
  p_data_source text, p_outcome text, p_error_code text, p_analysis_snapshot_id uuid,
  p_provider_call_log_id uuid, p_posts_returned integer, p_profiles_returned integer,
  p_estimated_cost_usd numeric, p_duration_ms integer, p_request_ip_hash text,
  p_user_agent_family text, p_display_name text, p_followers_last_seen bigint,
  p_analysis_window text
) FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.report_unlocks_balance(p_lead_id uuid)
  FROM PUBLIC, anon, authenticated;