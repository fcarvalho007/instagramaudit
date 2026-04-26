/**
 * GET /api/admin/diagnostics — readiness panel data.
 *
 * Reports the configuration state required for the Apify smoke test and
 * recent activity in `analysis_snapshots` and `report_requests`. Never
 * exposes the value of any secret — only a boolean indicating presence.
 *
 * Protected by `requireAdminSession`. Read-only.
 */

import { createFileRoute } from "@tanstack/react-router";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import {
  isFresh,
  isWithinStaleWindow,
  type SnapshotRow,
} from "@/lib/analysis/cache";
import {
  getAllowlist,
  isApifyEnabled,
  isTestingModeActive,
} from "@/lib/security/apify-allowlist";
import { getCostRates } from "@/lib/analysis/cost";

interface SnapshotsBlock {
  total: number | null;
  latest_at: string | null;
  latest_username: string | null;
  latest_status: string | null;
  latest_provider: string | null;
  latest_data_source: "fresh" | "cache" | "stale" | null;
  error: string | null;
}

interface ReportsBlock {
  total: number | null;
  latest_at: string | null;
  latest_request_status: string | null;
  latest_pdf_status: string | null;
  latest_delivery_status: string | null;
  latest_pdf_error: string | null;
  latest_email_error: string | null;
  error: string | null;
}

interface ActivityWindow {
  events: number;
  fresh: number;
  cache: number;
  failed: number;
  blocked: number;
  estimated_cost_usd: number;
}

interface AnalyticsBlock {
  last_24h: ActivityWindow;
  last_7d: ActivityWindow;
  unique_profiles_7d: number;
  error: string | null;
}

interface TopProfileRow {
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

interface RecentEventRow {
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

interface RecentProviderCallRow {
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

interface AlertRow {
  id: string;
  created_at: string;
  severity: string;
  kind: string;
  handle: string | null;
  metric_name: string;
  metric_value: number;
  threshold_value: number;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function hasSecret(name: string): boolean {
  const v = process.env[name];
  return typeof v === "string" && v.length > 0;
}

function emptyWindow(): ActivityWindow {
  return {
    events: 0,
    fresh: 0,
    cache: 0,
    failed: 0,
    blocked: 0,
    estimated_cost_usd: 0,
  };
}

type EventAggRow = {
  outcome: string | null;
  data_source: string | null;
  estimated_cost_usd: number | string | null;
  handle: string | null;
};

function foldEvents(rows: EventAggRow[]): ActivityWindow {
  const w = emptyWindow();
  for (const r of rows) {
    w.events += 1;
    if (r.data_source === "fresh" && r.outcome === "success") w.fresh += 1;
    if (r.data_source === "cache" || r.data_source === "stale") w.cache += 1;
    if (
      r.outcome === "provider_error" ||
      r.outcome === "not_found" ||
      r.outcome === "provider_disabled"
    )
      w.failed += 1;
    if (r.outcome === "blocked_allowlist") w.blocked += 1;
    const cost =
      typeof r.estimated_cost_usd === "string"
        ? Number.parseFloat(r.estimated_cost_usd)
        : (r.estimated_cost_usd ?? 0);
    if (Number.isFinite(cost)) w.estimated_cost_usd += cost;
  }
  // Round to 5 decimals to match the DB column scale.
  w.estimated_cost_usd = Math.round(w.estimated_cost_usd * 1e5) / 1e5;
  return w;
}

async function loadAnalytics(): Promise<AnalyticsBlock> {
  try {
    const now = Date.now();
    const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from("analysis_events")
      .select("outcome, data_source, estimated_cost_usd, handle, created_at")
      .gte("created_at", since7d)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      return {
        last_24h: emptyWindow(),
        last_7d: emptyWindow(),
        unique_profiles_7d: 0,
        error: error.message,
      };
    }

    const rows = (data ?? []) as Array<EventAggRow & { created_at: string }>;
    const last7d = foldEvents(rows);
    const last24h = foldEvents(
      rows.filter((r) => r.created_at >= since24h),
    );
    const uniques = new Set<string>();
    for (const r of rows) {
      if (r.handle) uniques.add(r.handle);
    }
    return {
      last_24h: last24h,
      last_7d: last7d,
      unique_profiles_7d: uniques.size,
      error: null,
    };
  } catch (err) {
    return {
      last_24h: emptyWindow(),
      last_7d: emptyWindow(),
      unique_profiles_7d: 0,
      error: (err as Error).message,
    };
  }
}

async function loadTopProfiles(): Promise<{
  rows: TopProfileRow[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from("social_profiles")
      .select(
        "network, handle, display_name, followers_last_seen, analyses_total, analyses_fresh, analyses_cache, analyses_failed, estimated_cost_usd_total, last_analyzed_at, last_outcome, last_data_source",
      )
      .order("analyses_total", { ascending: false })
      .limit(10);
    if (error) return { rows: [], error: error.message };
    return {
      rows: (data ?? []).map((r) => ({
        network: r.network,
        handle: r.handle,
        display_name: r.display_name,
        followers_last_seen: r.followers_last_seen,
        analyses_total: r.analyses_total,
        analyses_fresh: r.analyses_fresh,
        analyses_cache: r.analyses_cache,
        analyses_failed: r.analyses_failed,
        estimated_cost_usd_total: Number(r.estimated_cost_usd_total ?? 0),
        last_analyzed_at: r.last_analyzed_at,
        last_outcome: r.last_outcome,
        last_data_source: r.last_data_source,
      })),
      error: null,
    };
  } catch (err) {
    return { rows: [], error: (err as Error).message };
  }
}

async function loadRecentEvents(): Promise<{
  rows: RecentEventRow[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from("analysis_events")
      .select(
        "id, created_at, network, handle, outcome, data_source, estimated_cost_usd, duration_ms, error_code",
      )
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return { rows: [], error: error.message };
    return {
      rows: (data ?? []).map((r) => ({
        id: r.id,
        created_at: r.created_at,
        network: r.network,
        handle: r.handle,
        outcome: r.outcome,
        data_source: r.data_source,
        estimated_cost_usd:
          r.estimated_cost_usd === null ? null : Number(r.estimated_cost_usd),
        duration_ms: r.duration_ms,
        error_code: r.error_code,
      })),
      error: null,
    };
  } catch (err) {
    return { rows: [], error: (err as Error).message };
  }
}

async function loadRecentProviderCalls(): Promise<{
  rows: RecentProviderCallRow[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from("provider_call_logs")
      .select(
        "id, created_at, actor, handle, status, http_status, duration_ms, posts_returned, estimated_cost_usd",
      )
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) return { rows: [], error: error.message };
    return {
      rows: (data ?? []).map((r) => ({
        id: r.id,
        created_at: r.created_at,
        actor: r.actor,
        handle: r.handle,
        status: r.status,
        http_status: r.http_status,
        duration_ms: r.duration_ms,
        posts_returned: r.posts_returned ?? 0,
        estimated_cost_usd:
          r.estimated_cost_usd === null ? null : Number(r.estimated_cost_usd),
      })),
      error: null,
    };
  } catch (err) {
    return { rows: [], error: (err as Error).message };
  }
}

async function loadAlerts(): Promise<{
  rows: AlertRow[];
  error: string | null;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from("usage_alerts")
      .select(
        "id, created_at, severity, kind, handle, metric_name, metric_value, threshold_value",
      )
      .is("acknowledged_at", null)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) return { rows: [], error: error.message };
    return {
      rows: (data ?? []).map((r) => ({
        id: r.id,
        created_at: r.created_at,
        severity: r.severity,
        kind: r.kind,
        handle: r.handle,
        metric_name: r.metric_name,
        metric_value: Number(r.metric_value),
        threshold_value: Number(r.threshold_value),
      })),
      error: null,
    };
  } catch (err) {
    return { rows: [], error: (err as Error).message };
  }
}

async function loadSnapshots(): Promise<SnapshotsBlock> {
  try {
    const [{ count, error: countError }, { data, error: rowError }] =
      await Promise.all([
        supabaseAdmin
          .from("analysis_snapshots")
          .select("*", { count: "exact", head: true }),
        supabaseAdmin
          .from("analysis_snapshots")
          .select(
            "instagram_username, analysis_status, provider, updated_at, created_at, expires_at",
          )
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (countError) {
      return {
        total: null,
        latest_at: null,
        latest_username: null,
        latest_status: null,
        latest_provider: null,
        latest_data_source: null,
        error: countError.message,
      };
    }

    if (rowError || !data) {
      return {
        total: count ?? 0,
        latest_at: null,
        latest_username: null,
        latest_status: null,
        latest_provider: null,
        latest_data_source: null,
        error: rowError?.message ?? null,
      };
    }

    // Reuse the freshness/staleness rules from the cache layer so this panel
    // never disagrees with the public endpoint about what counts as fresh.
    const row = data as Pick<
      SnapshotRow,
      | "instagram_username"
      | "analysis_status"
      | "provider"
      | "updated_at"
      | "created_at"
      | "expires_at"
    >;
    const snapshotShape = {
      ...row,
      // isFresh / isWithinStaleWindow only need expires_at + created_at
    } as SnapshotRow;

    let dataSource: "fresh" | "cache" | "stale" = "stale";
    if (isFresh(snapshotShape)) dataSource = "fresh";
    else if (isWithinStaleWindow(snapshotShape)) dataSource = "cache";

    return {
      total: count ?? 0,
      latest_at: row.updated_at,
      latest_username: row.instagram_username,
      latest_status: row.analysis_status,
      latest_provider: row.provider,
      latest_data_source: dataSource,
      error: null,
    };
  } catch (err) {
    return {
      total: null,
      latest_at: null,
      latest_username: null,
      latest_status: null,
      latest_provider: null,
      latest_data_source: null,
      error: (err as Error).message,
    };
  }
}

async function loadReports(): Promise<ReportsBlock> {
  try {
    const [{ count, error: countError }, { data, error: rowError }] =
      await Promise.all([
        supabaseAdmin
          .from("report_requests")
          .select("*", { count: "exact", head: true }),
        supabaseAdmin
          .from("report_requests")
          .select(
            "request_status, pdf_status, delivery_status, pdf_error_message, email_error_message, updated_at",
          )
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (countError) {
      return {
        total: null,
        latest_at: null,
        latest_request_status: null,
        latest_pdf_status: null,
        latest_delivery_status: null,
        latest_pdf_error: null,
        latest_email_error: null,
        error: countError.message,
      };
    }

    if (rowError || !data) {
      return {
        total: count ?? 0,
        latest_at: null,
        latest_request_status: null,
        latest_pdf_status: null,
        latest_delivery_status: null,
        latest_pdf_error: null,
        latest_email_error: null,
        error: rowError?.message ?? null,
      };
    }

    const row = data as {
      request_status: string;
      pdf_status: string;
      delivery_status: string;
      pdf_error_message: string | null;
      email_error_message: string | null;
      updated_at: string;
    };
    return {
      total: count ?? 0,
      latest_at: row.updated_at,
      latest_request_status: row.request_status,
      latest_pdf_status: row.pdf_status,
      latest_delivery_status: row.delivery_status,
      latest_pdf_error: row.pdf_error_message,
      latest_email_error: row.email_error_message,
      error: null,
    };
  } catch (err) {
    return {
      total: null,
      latest_at: null,
      latest_request_status: null,
      latest_pdf_status: null,
      latest_delivery_status: null,
      latest_pdf_error: null,
      latest_email_error: null,
      error: (err as Error).message,
    };
  }
}

export const Route = createFileRoute("/api/admin/diagnostics")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const [
          snapshots,
          reports,
          analytics,
          topProfiles,
          recentEvents,
          recentProviderCalls,
          alerts,
        ] = await Promise.all([
          loadSnapshots(),
          loadReports(),
          loadAnalytics(),
          loadTopProfiles(),
          loadRecentEvents(),
          loadRecentProviderCalls(),
          loadAlerts(),
        ]);

        const costRates = getCostRates();

        const body = {
          secrets: {
            APIFY_TOKEN: hasSecret("APIFY_TOKEN"),
            RESEND_API_KEY: hasSecret("RESEND_API_KEY"),
            INTERNAL_API_TOKEN: hasSecret("INTERNAL_API_TOKEN"),
          },
          apify: {
            enabled: isApifyEnabled(),
            cost_per_profile_usd: costRates.perProfile,
            cost_per_post_usd: costRates.perPost,
          },
          testing_mode: {
            active: isTestingModeActive(),
            allowlist: getAllowlist(),
          },
          snapshots,
          report_requests: reports,
          analytics,
          top_profiles: topProfiles,
          recent_events: recentEvents,
          recent_provider_calls: recentProviderCalls,
          alerts,
          generated_at: new Date().toISOString(),
        };

        return jsonResponse({ success: true, ...body }, 200);
      },
    },
  },
});
