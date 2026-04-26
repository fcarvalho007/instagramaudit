/**
 * Shared response shape for the cockpit hook.
 *
 * Mirrors the payload of `GET /api/admin/diagnostics`. Defined once so
 * every tab consumes a consistent type without duplicating interfaces.
 */

export interface ActivityWindow {
  events: number;
  fresh: number;
  cache: number;
  failed: number;
  blocked: number;
  estimated_cost_usd: number;
}

export interface TopProfileRow {
  network: string;
  handle: string;
  display_name: string | null;
  followers_last_seen: number | null;
  analyses_total: number;
  analyses_fresh: number;
  analyses_cache: number;
  analyses_failed: number;
  estimated_cost_usd_total: number;
  last_analyzed_at: string;
  last_outcome: string | null;
  last_data_source: string | null;
}

export interface RecentEventRow {
  id: string;
  created_at: string;
  network: string;
  handle: string;
  outcome: string;
  data_source: string;
  estimated_cost_usd: number | null;
  duration_ms: number | null;
  error_code: string | null;
}

export interface RecentProviderCallRow {
  id: string;
  created_at: string;
  actor: string;
  handle: string;
  status: string;
  http_status: number | null;
  duration_ms: number | null;
  posts_returned: number;
  estimated_cost_usd: number | null;
}

export interface AlertRow {
  id: string;
  created_at: string;
  severity: string;
  kind: string;
  handle: string | null;
  metric_name: string;
  metric_value: number;
  threshold_value: number;
}

export interface AlertThresholds {
  repeated_profile_per_hour: number;
  failure_rate_min_events: number;
  failure_rate: number;
  ip_burst_per_hour: number;
  daily_cost_usd: number;
}

export interface ApifyRuntimeCheck {
  apify_token_present: boolean;
  apify_enabled_raw_is_true: boolean;
  apify_enabled_state_label:
    | "Ligado · chamadas reais"
    | "Desligado · sem chamadas";
  testing_mode_active: boolean;
  allowlist_count: number;
  allowlist_includes_test_handle: boolean;
  test_handle: "frederico.m.carvalho";
  ready_for_smoke_test: boolean;
  blocking_reason: string | null;
}

export interface SnapshotsBlock {
  total: number | null;
  latest_at: string | null;
  latest_username: string | null;
  latest_status: string | null;
  latest_provider: string | null;
  latest_data_source: "fresh" | "cache" | "stale" | null;
  error: string | null;
}

export interface ReportsBlock {
  total: number | null;
  latest_at: string | null;
  latest_request_status: string | null;
  latest_pdf_status: string | null;
  latest_delivery_status: string | null;
  latest_pdf_error: string | null;
  latest_email_error: string | null;
  error: string | null;
}

export interface CockpitData {
  success: true;
  secrets: {
    APIFY_TOKEN: boolean;
    RESEND_API_KEY: boolean;
    INTERNAL_API_TOKEN: boolean;
  };
  apify: {
    enabled: boolean;
    cost_per_profile_usd: number;
    cost_per_post_usd: number;
  };
  testing_mode: {
    active: boolean;
    allowlist: string[];
  };
  snapshots: SnapshotsBlock;
  report_requests: ReportsBlock;
  analytics: {
    last_24h: ActivityWindow;
    last_7d: ActivityWindow;
    unique_profiles_7d: number;
    error: string | null;
  };
  top_profiles: { rows: TopProfileRow[]; error: string | null };
  recent_events: { rows: RecentEventRow[]; error: string | null };
  recent_provider_calls: {
    rows: RecentProviderCallRow[];
    error: string | null;
  };
  alerts: { rows: AlertRow[]; error: string | null };
  alert_thresholds?: AlertThresholds;
  apify_runtime_check?: ApifyRuntimeCheck;
  generated_at: string;
}