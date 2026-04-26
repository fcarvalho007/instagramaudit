/**
 * Inline `usage_alerts` evaluator (server-only).
 *
 * Cheap heuristics that run after each `analysis_events` insert. Each alert
 * kind has its own window, threshold and dedup key so the table never spams.
 *
 * Triggered alerts (v1):
 *   - `repeated_profile`     same handle ≥ N events in last 1h
 *   - `high_failure_rate`    failure ratio ≥ T over ≥ M events in last 1h
 *   - `ip_burst`             same IP hash ≥ N events in last 1h
 *   - `daily_cost_threshold` sum(estimated_cost_usd) in last 24h ≥ $X
 *   - `stale_serve`          immediate, fires once per (handle, hour)
 *
 * All thresholds are env-overridable so we can tune without redeploy. Every
 * call is best-effort: logging failures must never break the analyze route.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type {
  AnalysisDataSource,
  AnalysisOutcome,
} from "@/lib/analysis/events";

function readEnvNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Bucketed timestamp aligned to the hour (UTC). */
function startOfHour(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setUTCMinutes(0, 0, 0);
  return x;
}

/** Bucketed timestamp aligned to the day (UTC). */
function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

export type UsageAlertKind =
  | "repeated_profile"
  | "high_failure_rate"
  | "ip_burst"
  | "daily_cost_threshold"
  | "stale_serve";

export type UsageAlertSeverity = "info" | "warning" | "critical";

interface InsertAlertInput {
  kind: UsageAlertKind;
  severity: UsageAlertSeverity;
  network?: string | null;
  handle?: string | null;
  requestIpHash?: string | null;
  windowStart: Date;
  windowEnd: Date;
  metricName: string;
  metricValue: number;
  thresholdValue: number;
  notes?: string | null;
}

/**
 * Insert one alert if no unack'd row exists for the same dedup key
 * (kind + handle + ip + window_start). Errors are swallowed.
 */
async function insertAlertIfNew(input: InsertAlertInput): Promise<void> {
  try {
    const dedup = supabaseAdmin
      .from("usage_alerts")
      .select("id")
      .eq("kind", input.kind)
      .eq("window_start", input.windowStart.toISOString())
      .is("acknowledged_at", null)
      .limit(1);
    // Match nullable scope columns precisely so kinds with NULL handle
    // (global checks like high_failure_rate) don't collide with handle-scoped ones.
    const scoped = input.handle
      ? dedup.eq("handle", input.handle)
      : dedup.is("handle", null);
    const fullyScoped = input.requestIpHash
      ? scoped.eq("request_ip_hash", input.requestIpHash)
      : scoped.is("request_ip_hash", null);
    const { data: existing, error: lookupError } = await fullyScoped;
    if (lookupError) {
      console.error("[alerts] dedup lookup failed", lookupError.message);
      return;
    }
    if (existing && existing.length > 0) return;

    const { error: insertError } = await supabaseAdmin
      .from("usage_alerts")
      .insert({
        kind: input.kind,
        severity: input.severity,
        network: input.network ?? "instagram",
        handle: input.handle ?? null,
        request_ip_hash: input.requestIpHash ?? null,
        window_start: input.windowStart.toISOString(),
        window_end: input.windowEnd.toISOString(),
        metric_name: input.metricName,
        metric_value: input.metricValue,
        threshold_value: input.thresholdValue,
        notes: input.notes ?? null,
      });
    if (insertError) {
      console.error("[alerts] insert failed", insertError.message);
    }
  } catch (err) {
    console.error("[alerts] insertAlertIfNew threw", err);
  }
}

export interface EvaluateAlertsInput {
  network?: string;
  handle: string;
  requestIpHash?: string | null;
  dataSource: AnalysisDataSource;
  outcome: AnalysisOutcome;
}

/**
 * Evaluate all alert kinds for one event. Designed to be invoked
 * fire-and-forget right after `recordAnalysisEvent`. Single Supabase round
 * trip per kind; all errors are swallowed.
 */
export async function evaluateAlertsForEvent(
  input: EvaluateAlertsInput,
): Promise<void> {
  const network = (input.network ?? "instagram").toLowerCase();
  const handle = input.handle.toLowerCase();
  const now = new Date();
  const hourStart = startOfHour(now);
  const dayStart = startOfDay(now);
  const since1h = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const T_REPEATED = readEnvNumber("ALERT_REPEATED_PROFILE_PER_HOUR", 5);
  const T_FAILURE_MIN_EVENTS = readEnvNumber(
    "ALERT_FAILURE_RATE_MIN_EVENTS",
    10,
  );
  const T_FAILURE_RATE = readEnvNumber("ALERT_FAILURE_RATE", 0.5);
  const T_IP_BURST = readEnvNumber("ALERT_IP_BURST_PER_HOUR", 20);
  const T_DAILY_COST_USD = readEnvNumber("ALERT_DAILY_COST_USD", 1);

  const tasks: Array<Promise<unknown>> = [];

  // 1) Stale serve — immediate signal. One alert per (handle, hour).
  if (input.dataSource === "stale" && input.outcome === "success") {
    tasks.push(
      insertAlertIfNew({
        kind: "stale_serve",
        severity: "warning",
        network,
        handle,
        windowStart: hourStart,
        windowEnd: new Date(hourStart.getTime() + 60 * 60 * 1000),
        metricName: "stale_events_in_hour",
        metricValue: 1,
        thresholdValue: 1,
        notes: "Apify indisponível ou desativado — servida snapshot expirada.",
      }),
    );
  }

  // 2) Repeated profile in the last hour (same handle).
  tasks.push(
    (async () => {
      const { count, error } = await supabaseAdmin
        .from("analysis_events")
        .select("id", { count: "exact", head: true })
        .eq("network", network)
        .eq("handle", handle)
        .gte("created_at", since1h);
      if (error) {
        console.error("[alerts] repeated_profile query failed", error.message);
        return;
      }
      const value = count ?? 0;
      if (value >= T_REPEATED) {
        await insertAlertIfNew({
          kind: "repeated_profile",
          severity: value >= T_REPEATED * 2 ? "critical" : "warning",
          network,
          handle,
          windowStart: hourStart,
          windowEnd: new Date(hourStart.getTime() + 60 * 60 * 1000),
          metricName: "events_per_hour",
          metricValue: value,
          thresholdValue: T_REPEATED,
        });
      }
    })(),
  );

  // 3) High failure rate (global), last 1h.
  tasks.push(
    (async () => {
      const { data, error } = await supabaseAdmin
        .from("analysis_events")
        .select("outcome")
        .gte("created_at", since1h)
        .limit(2000);
      if (error) {
        console.error("[alerts] failure_rate query failed", error.message);
        return;
      }
      const total = data?.length ?? 0;
      if (total < T_FAILURE_MIN_EVENTS) return;
      const failures = (data ?? []).filter(
        (r) =>
          r.outcome === "provider_error" ||
          r.outcome === "not_found" ||
          r.outcome === "provider_disabled",
      ).length;
      const rate = failures / total;
      if (rate >= T_FAILURE_RATE) {
        await insertAlertIfNew({
          kind: "high_failure_rate",
          severity: rate >= 0.8 ? "critical" : "warning",
          network: null,
          handle: null,
          windowStart: hourStart,
          windowEnd: new Date(hourStart.getTime() + 60 * 60 * 1000),
          metricName: "failure_rate",
          metricValue: Math.round(rate * 1e4) / 1e4,
          thresholdValue: T_FAILURE_RATE,
          notes: `${failures}/${total} eventos com falha na última hora.`,
        });
      }
    })(),
  );

  // 4) IP burst — same hash ≥ N events in last 1h. Skip when no hash.
  if (input.requestIpHash) {
    const ipHash = input.requestIpHash;
    tasks.push(
      (async () => {
        const { count, error } = await supabaseAdmin
          .from("analysis_events")
          .select("id", { count: "exact", head: true })
          .eq("request_ip_hash", ipHash)
          .gte("created_at", since1h);
        if (error) {
          console.error("[alerts] ip_burst query failed", error.message);
          return;
        }
        const value = count ?? 0;
        if (value >= T_IP_BURST) {
          await insertAlertIfNew({
            kind: "ip_burst",
            severity: value >= T_IP_BURST * 2 ? "critical" : "warning",
            network: null,
            handle: null,
            requestIpHash: ipHash,
            windowStart: hourStart,
            windowEnd: new Date(hourStart.getTime() + 60 * 60 * 1000),
            metricName: "events_per_hour",
            metricValue: value,
            thresholdValue: T_IP_BURST,
            notes: "Burst de pedidos do mesmo IP (hash diário rotativo).",
          });
        }
      })(),
    );
  }

  // 5) Daily cost threshold — only re-check after a fresh success
  // (the only path that adds cost). Cheap: one aggregate query.
  if (input.dataSource === "fresh" && input.outcome === "success") {
    tasks.push(
      (async () => {
        const { data, error } = await supabaseAdmin
          .from("analysis_events")
          .select("estimated_cost_usd")
          .gte("created_at", since24h)
          .not("estimated_cost_usd", "is", null)
          .limit(5000);
        if (error) {
          console.error("[alerts] daily_cost query failed", error.message);
          return;
        }
        const total = (data ?? []).reduce((sum, r) => {
          const v =
            typeof r.estimated_cost_usd === "string"
              ? Number.parseFloat(r.estimated_cost_usd)
              : (r.estimated_cost_usd ?? 0);
          return sum + (Number.isFinite(v) ? v : 0);
        }, 0);
        const rounded = Math.round(total * 1e5) / 1e5;
        if (rounded >= T_DAILY_COST_USD) {
          await insertAlertIfNew({
            kind: "daily_cost_threshold",
            severity: rounded >= T_DAILY_COST_USD * 2 ? "critical" : "warning",
            network: null,
            handle: null,
            windowStart: dayStart,
            windowEnd: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000),
            metricName: "cost_usd_24h",
            metricValue: rounded,
            thresholdValue: T_DAILY_COST_USD,
            notes: `Custo estimado nas últimas 24h ≥ ${T_DAILY_COST_USD} USD.`,
          });
        }
      })(),
    );
  }

  await Promise.allSettled(tasks);
}

/**
 * Configured thresholds, exposed for the admin diagnostics panel.
 */
export function getAlertThresholds() {
  return {
    repeated_profile_per_hour: readEnvNumber(
      "ALERT_REPEATED_PROFILE_PER_HOUR",
      5,
    ),
    failure_rate_min_events: readEnvNumber("ALERT_FAILURE_RATE_MIN_EVENTS", 10),
    failure_rate: readEnvNumber("ALERT_FAILURE_RATE", 0.5),
    ip_burst_per_hour: readEnvNumber("ALERT_IP_BURST_PER_HOUR", 20),
    daily_cost_usd: readEnvNumber("ALERT_DAILY_COST_USD", 1),
  };
}