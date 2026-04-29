/**
 * Queries server-side da tab Sistema do admin v2.
 * Todas as funções leem de `provider_call_logs`, `usage_alerts`, `cost_daily`,
 * `app_config` e `analysis_events` via supabaseAdmin (bypass RLS — só servidor).
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/* ============================================================ Types -- */

export type HealthStatus = "operational" | "attention" | "critical";

export interface HealthChip {
  service: string;
  status: HealthStatus;
  detail: string;
}

export interface RuntimeCheck {
  name: string;
  status: "ok" | "warn" | "fail";
  detail: string;
}

export interface SecretPresence {
  name: string;
  configured: boolean;
}

export interface Cost24hMetrics {
  apify: { amount_usd: number; calls: number };
  openai: { amount_usd: number; calls: number };
  dataforseo: { amount_usd: number; calls: number };
  cache_hits: number;
  cache_savings_usd: number;
}

export interface ProviderCallRow {
  id: string;
  when: string;
  provider: string;
  model: string;
  handle: string;
  status: "success" | "cache" | "failure";
  http: number | null;
  duration: string;
  cost: string | null;
}

export interface AlertRow {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  when: string;
  created_at: string;
}

export interface ExpenseDailyPoint {
  day: string;
  apify: number;
  openai: number;
  dataforseo: number;
}

export interface Expense30d {
  apify_total: number;
  openai_total: number;
  dataforseo_total: number;
  total: number;
  apify_calls: number;
  openai_calls: number;
  dataforseo_calls: number;
  dataforseo_balance: number | null;
  daily: ExpenseDailyPoint[];
  /**
   * Apify monthly billed amount (últimos 30 dias) lido de `cost_daily`,
   * que é populado pelo sync da Apify monthly usage API. Usado apenas
   * para reconciliação visual com a fatura — pode ser null se o sync
   * ainda não correu.
   */
  apify_billed_total_30d: number | null;
}

export interface CostCaps {
  apify: number;
  openai: number;
  dataforseo: number;
}

/* ====================================================== Helpers -- */

function isoSinceHours(hours: number): string {
  return new Date(Date.now() - hours * HOUR_MS).toISOString();
}

function dayKey(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  if (sameDay) return `${hh}:${mm}`;
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mo} ${hh}:${mm}`;
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < HOUR_MS) {
    const mins = Math.max(1, Math.round(diff / 60000));
    return `há ${mins} min`;
  }
  if (diff < DAY_MS) {
    return `há ${Math.round(diff / HOUR_MS)}h`;
  }
  return `há ${Math.round(diff / DAY_MS)}d`;
}

function fmtDuration(ms: number | null | undefined): string {
  if (!ms || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtCost(usd: number | null | undefined): string | null {
  if (usd === null || usd === undefined) return null;
  const n = Number(usd);
  if (!Number.isFinite(n) || n === 0) return null;
  return `$${n.toFixed(n < 0.01 ? 4 : 3)}`;
}

/* =================================================== Health & checks -- */

const SECRET_NAMES = [
  "APIFY_TOKEN",
  "APIFY_ENABLED",
  "APIFY_ALLOWLIST",
  "APIFY_TESTING_MODE",
  "OPENAI_API_KEY",
  "OPENAI_ENABLED",
  "DATAFORSEO_LOGIN",
  "DATAFORSEO_PASSWORD",
  "DATAFORSEO_ENABLED",
  "DATAFORSEO_ALLOWLIST",
  "RESEND_API_KEY",
  "INTERNAL_API_TOKEN",
  "ADMIN_ALLOWED_EMAILS",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

export function listSecretPresence(): SecretPresence[] {
  return SECRET_NAMES.map((name) => ({
    name,
    configured: Boolean(process.env[name] && process.env[name]!.length > 0),
  }));
}

async function lastCallStatus(
  provider: string,
): Promise<{ status: HealthStatus; detail: string }> {
  const { data, error } = await supabaseAdmin
    .from("provider_call_logs")
    .select("status, http_status, created_at")
    .eq("provider", provider)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) return { status: "attention", detail: "Sem dados" };
  if (!data || data.length === 0) {
    return { status: "operational", detail: "Sem chamadas recentes" };
  }
  const failures = data.filter((r) => r.status === "failure").length;
  if (failures >= 3) return { status: "critical", detail: `${failures}/5 falhas` };
  if (failures > 0) return { status: "attention", detail: `${failures}/5 falhas` };
  return { status: "operational", detail: "Operacional" };
}

export async function fetchSystemHealth(): Promise<HealthChip[]> {
  const [apify, openai, dfs] = await Promise.all([
    lastCallStatus("apify"),
    lastCallStatus("openai"),
    lastCallStatus("dataforseo"),
  ]);

  const resendOk = Boolean(process.env.RESEND_API_KEY);
  const supabaseOk = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return [
    { service: "Apify", ...apify },
    { service: "OpenAI", ...openai },
    { service: "DataForSEO", ...dfs },
    {
      service: "Resend",
      status: resendOk ? "operational" : "critical",
      detail: resendOk ? "Operacional" : "Em falta",
    },
    {
      service: "Supabase",
      status: supabaseOk ? "operational" : "critical",
      detail: supabaseOk ? "Operacional" : "Em falta",
    },
  ];
}

export function fetchRuntimeChecks(): RuntimeCheck[] {
  const has = (k: string) =>
    Boolean(process.env[k] && process.env[k]!.length > 0);
  const isTrue = (k: string) => process.env[k] === "true";
  const allowlist = (process.env.APIFY_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const dfsAllowlist = (process.env.DATAFORSEO_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const checks: RuntimeCheck[] = [
    {
      name: "Token Apify",
      status: has("APIFY_TOKEN") ? "ok" : "fail",
      detail: has("APIFY_TOKEN") ? "Configurado" : "Em falta",
    },
    {
      name: "APIFY_ENABLED",
      status: isTrue("APIFY_ENABLED") ? "ok" : "warn",
      detail: isTrue("APIFY_ENABLED") ? "Ligado · chamadas reais" : "Desligado",
    },
    {
      name: "Modo de teste Apify",
      status:
        isTrue("APIFY_TESTING_MODE") && allowlist.length > 0 ? "ok" : "warn",
      detail:
        allowlist.length > 0
          ? `Allowlist activa · ${allowlist.length} handle(s)`
          : "Sem allowlist",
    },
    {
      name: "DataForSEO credenciais",
      status: has("DATAFORSEO_LOGIN") && has("DATAFORSEO_PASSWORD") ? "ok" : "fail",
      detail:
        has("DATAFORSEO_LOGIN") && has("DATAFORSEO_PASSWORD")
          ? "Configuradas"
          : "Em falta",
    },
    {
      name: "DATAFORSEO_ENABLED",
      status: isTrue("DATAFORSEO_ENABLED") ? "ok" : "warn",
      detail: isTrue("DATAFORSEO_ENABLED")
        ? `Ligado · ${dfsAllowlist.length} handle(s)`
        : "Desligado",
    },
    {
      name: "OpenAI API Key",
      status: has("OPENAI_API_KEY") ? "ok" : "fail",
      detail: has("OPENAI_API_KEY") ? "Configurada" : "Em falta",
    },
    {
      name: "Estado final",
      status:
        has("APIFY_TOKEN") && has("OPENAI_API_KEY") && has("DATAFORSEO_LOGIN")
          ? "ok"
          : "warn",
      detail:
        has("APIFY_TOKEN") && has("OPENAI_API_KEY") && has("DATAFORSEO_LOGIN")
          ? "Pronto para análise completa"
          : "Falta configuração",
    },
  ];

  return checks;
}

/* ===================================================== Cost metrics 24h -- */

export async function fetchCostMetrics24h(): Promise<Cost24hMetrics> {
  const since = isoSinceHours(24);
  const { data: logs } = await supabaseAdmin
    .from("provider_call_logs")
    .select("provider, actual_cost_usd, estimated_cost_usd, status")
    .gte("created_at", since);

  const acc = {
    apify: { amount_usd: 0, calls: 0 },
    openai: { amount_usd: 0, calls: 0 },
    dataforseo: { amount_usd: 0, calls: 0 },
  };
  let apifyFreshSum = 0;
  let apifyFreshCount = 0;

  for (const row of logs ?? []) {
    const cost = Number(row.actual_cost_usd ?? row.estimated_cost_usd ?? 0);
    const provider = String(row.provider) as keyof typeof acc;
    if (provider in acc) {
      acc[provider].amount_usd += cost;
      acc[provider].calls += 1;
      if (provider === "apify" && row.status === "success") {
        apifyFreshSum += cost;
        apifyFreshCount += 1;
      }
    }
  }

  const { count: cacheHits } = await supabaseAdmin
    .from("analysis_events")
    .select("id", { count: "exact", head: true })
    .eq("data_source", "cache")
    .gte("created_at", since);

  const avgFresh = apifyFreshCount > 0 ? apifyFreshSum / apifyFreshCount : 0;
  const cacheSavings = (cacheHits ?? 0) * avgFresh;

  return {
    apify: {
      amount_usd: Number(acc.apify.amount_usd.toFixed(4)),
      calls: acc.apify.calls,
    },
    openai: {
      amount_usd: Number(acc.openai.amount_usd.toFixed(4)),
      calls: acc.openai.calls,
    },
    dataforseo: {
      amount_usd: Number(acc.dataforseo.amount_usd.toFixed(4)),
      calls: acc.dataforseo.calls,
    },
    cache_hits: cacheHits ?? 0,
    cache_savings_usd: Number(cacheSavings.toFixed(4)),
  };
}

/* =================================================== Provider call rows -- */

export async function fetchRecentProviderCalls(
  limit = 20,
): Promise<ProviderCallRow[]> {
  const { data, error } = await supabaseAdmin
    .from("provider_call_logs")
    .select(
      "id, created_at, provider, actor, model, handle, status, http_status, duration_ms, actual_cost_usd, estimated_cost_usd",
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];

  return (data ?? []).map((row) => {
    const status = (
      row.status === "cache" || row.status === "failure" ? row.status : "success"
    ) as ProviderCallRow["status"];
    return {
      id: String(row.id),
      when: fmtWhen(String(row.created_at)),
      provider: String(row.provider ?? "—"),
      model: String(row.model ?? row.actor ?? "—"),
      handle: row.handle ? `@${row.handle}` : "—",
      status,
      http: row.http_status ?? null,
      duration: fmtDuration(row.duration_ms ?? null),
      cost: fmtCost(row.actual_cost_usd ?? row.estimated_cost_usd),
    };
  });
}

/* ============================================================ Alerts -- */

const ALERT_TITLE: Record<string, string> = {
  spike_per_handle: "Pico de chamadas para o mesmo perfil",
  spike_per_ip: "Pico de chamadas a partir do mesmo IP",
  failure_burst: "Várias falhas consecutivas no provedor",
  cost_cap: "Cap de custo atingido",
};

export async function fetchOpenAlerts(): Promise<AlertRow[]> {
  const { data, error } = await supabaseAdmin
    .from("usage_alerts")
    .select(
      "id, severity, kind, handle, metric_name, metric_value, threshold_value, notes, created_at",
    )
    .is("acknowledged_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return [];
  return (data ?? []).map((a) => {
    const severity = (
      a.severity === "critical" || a.severity === "info" ? a.severity : "warning"
    ) as AlertRow["severity"];
    const handle = a.handle ? `@${a.handle}` : "—";
    const title = a.notes || ALERT_TITLE[String(a.kind)] || String(a.kind);
    const detail = `${handle} · ${a.metric_name}=${a.metric_value} (limite ${a.threshold_value})`;
    return {
      id: String(a.id),
      severity,
      title,
      detail,
      when: fmtRelative(String(a.created_at)),
      created_at: String(a.created_at),
    };
  });
}

export async function ackAlert(id: string): Promise<void> {
  await supabaseAdmin
    .from("usage_alerts")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", id);
}

/* =================================================== Expense 30d -- */

export async function fetchExpense30d(): Promise<Expense30d> {
  const start = dayKey(new Date(Date.now() - 30 * DAY_MS));
  const { data: rows } = await supabaseAdmin
    .from("cost_daily")
    .select("provider, day, amount_usd, call_count, details")
    .gte("day", start)
    .order("day", { ascending: true });

  const totals = { apify: 0, openai: 0, dataforseo: 0 };
  const calls = { apify: 0, openai: 0, dataforseo: 0 };
  const dayMap = new Map<string, ExpenseDailyPoint>();
  let dataforseoBalance: number | null = null;

  for (const r of rows ?? []) {
    const provider = String(r.provider) as keyof typeof totals;
    if (!(provider in totals)) continue;
    const amount = Number(r.amount_usd ?? 0);
    totals[provider] += amount;
    calls[provider] += Number(r.call_count ?? 0);
    const day = String(r.day);
    const point = dayMap.get(day) ?? {
      day,
      apify: 0,
      openai: 0,
      dataforseo: 0,
    };
    point[provider] = Number((point[provider] + amount).toFixed(4));
    dayMap.set(day, point);
    if (provider === "dataforseo") {
      const bal = (r.details as { balance_at_snapshot?: number } | null)
        ?.balance_at_snapshot;
      if (typeof bal === "number") dataforseoBalance = bal;
    }
  }

  const daily = Array.from(dayMap.values()).sort((a, b) =>
    a.day.localeCompare(b.day),
  );

  return {
    apify_total: Number(totals.apify.toFixed(4)),
    openai_total: Number(totals.openai.toFixed(4)),
    dataforseo_total: Number(totals.dataforseo.toFixed(4)),
    total: Number((totals.apify + totals.openai + totals.dataforseo).toFixed(4)),
    apify_calls: calls.apify,
    openai_calls: calls.openai,
    dataforseo_calls: calls.dataforseo,
    dataforseo_balance: dataforseoBalance,
    daily,
  };
}

/* ============================================================ Caps -- */

export async function fetchCostCaps(): Promise<CostCaps> {
  const { data } = await supabaseAdmin
    .from("app_config")
    .select("key, value")
    .like("key", "cost_cap_%");
  const map = new Map((data ?? []).map((r) => [String(r.key), String(r.value)]));
  return {
    apify: Number(map.get("cost_cap_apify_usd") ?? 29),
    openai: Number(map.get("cost_cap_openai_usd") ?? 25),
    dataforseo: Number(map.get("cost_cap_dataforseo_usd") ?? 50),
  };
}

export async function setCostCap(
  provider: keyof CostCaps,
  value: number,
  updatedBy?: string,
): Promise<void> {
  const key = `cost_cap_${provider}_usd`;
  await supabaseAdmin.from("app_config").upsert(
    {
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
      updated_by: updatedBy ?? null,
    },
    { onConflict: "key" },
  );
}
