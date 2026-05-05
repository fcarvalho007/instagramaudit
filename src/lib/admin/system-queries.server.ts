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
  apify_actors: ApifyActorBreakdown[];
  openai_actors: OpenAiActorBreakdown[];
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
  /** Per-actor Apify breakdown for chart sub-bars */
  apify_by_actor?: Record<string, number>;
  /** Per-actor OpenAI breakdown for chart sub-bars */
  openai_by_actor?: Record<string, number>;
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
  /** Actor-level breakdown within Apify costs */
  apify_actors: ApifyActorBreakdown[];
  /** Actor-level breakdown within OpenAI costs */
  openai_actors: OpenAiActorBreakdown[];
}

export interface CostCaps {
  apify: number;
  openai: number;
  dataforseo: number;
}

/* ====================================================== Helpers -- */

/* ================================================= Apify Actor Breakdown -- */

export interface ApifyActorBreakdown {
  actor: string;
  label: string;
  total_cost_usd: number;
  actual_total_usd: number;
  estimated_total_usd: number;
  unavailable_count: number;
  run_count: number;
  error_count: number;
  total_results: number;
  avg_cost_per_run: number | null;
  cost_per_1k_results: number | null;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_cost_usd: number | null;
  cost_source: "actual" | "estimated" | "mixed" | "unavailable";
  included_in_free_report: boolean;
}

export interface OpenAiActorBreakdown {
  actor: string;
  label: string;
  total_cost_usd: number;
  call_count: number;
  error_count: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  avg_cost_per_call: number | null;
  last_call_at: string | null;
  model: string | null;
}

const OPENAI_ACTOR_LABELS: Record<string, string> = {
  "visual-cover-analysis": "Análise visual (covers)",
};

function openaiActorLabel(actor: string): string {
  if (OPENAI_ACTOR_LABELS[actor]) return OPENAI_ACTOR_LABELS[actor];
  if (actor.startsWith("insights:")) return `Insights (${actor.replace("insights:", "")})`;
  return actor;
}

export async function aggregateOpenAiActorBreakdown(
  sinceIso: string,
): Promise<OpenAiActorBreakdown[]> {
  const { data: logs } = await supabaseAdmin
    .from("provider_call_logs")
    .select("actor, status, estimated_cost_usd, model, prompt_tokens, completion_tokens, created_at")
    .eq("provider", "openai")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });

  const map = new Map<string, {
    cost: number; calls: number; errors: number;
    promptTokens: number; completionTokens: number;
    lastAt: string | null; model: string | null;
  }>();

  for (const row of logs ?? []) {
    const actor = String(row.actor ?? "unknown");
    let acc = map.get(actor);
    if (!acc) {
      acc = { cost: 0, calls: 0, errors: 0, promptTokens: 0, completionTokens: 0, lastAt: null, model: null };
      map.set(actor, acc);
    }
    const status = String(row.status);
    if (status !== "success" && status !== "cache") {
      acc.errors += 1;
      continue;
    }
    acc.calls += 1;
    acc.cost += Number(row.estimated_cost_usd ?? 0);
    acc.promptTokens += Number(row.prompt_tokens ?? 0);
    acc.completionTokens += Number(row.completion_tokens ?? 0);
    if (!acc.lastAt) {
      acc.lastAt = String(row.created_at);
      acc.model = row.model ?? null;
    }
  }

  const results: OpenAiActorBreakdown[] = [];
  for (const [actor, acc] of map) {
    results.push({
      actor,
      label: openaiActorLabel(actor),
      total_cost_usd: Number(acc.cost.toFixed(6)),
      call_count: acc.calls,
      error_count: acc.errors,
      total_prompt_tokens: acc.promptTokens,
      total_completion_tokens: acc.completionTokens,
      avg_cost_per_call: acc.calls > 0 ? Number((acc.cost / acc.calls).toFixed(6)) : null,
      last_call_at: acc.lastAt,
      model: acc.model,
    });
  }

  // Sort: insights first, then by cost descending
  results.sort((a, b) => {
    const aInsights = a.actor.startsWith("insights:") ? 0 : 1;
    const bInsights = b.actor.startsWith("insights:") ? 0 : 1;
    if (aInsights !== bInsights) return aInsights - bInsights;
    return b.total_cost_usd - a.total_cost_usd;
  });

  return results;
}

const APIFY_ACTOR_LABELS: Record<string, string> = {
  actual_total_usd: number;
  estimated_total_usd: number;
  unavailable_count: number;
  run_count: number;
  error_count: number;
  total_results: number;
  avg_cost_per_run: number | null;
  cost_per_1k_results: number | null;
  last_run_at: string | null;
  last_run_status: string | null;
  last_run_cost_usd: number | null;
  cost_source: "actual" | "estimated" | "mixed" | "unavailable";
  included_in_free_report: boolean;
}

const APIFY_ACTOR_LABELS: Record<string, string> = {
  "apify/instagram-profile-scraper": "Scraper de perfil Instagram",
  "apify/instagram-post-scraper": "Scraper de posts Instagram",
  "apify/instagram-comment-scraper": "Scraper de comentários Instagram",
};

const KNOWN_APIFY_ACTORS = [
  "apify/instagram-profile-scraper",
  "apify/instagram-comment-scraper",
];

export async function aggregateApifyActorBreakdown(
  sinceIso: string,
): Promise<ApifyActorBreakdown[]> {
  const { data: logs } = await supabaseAdmin
    .from("provider_call_logs")
    .select("actor, status, actual_cost_usd, estimated_cost_usd, posts_returned, created_at")
    .eq("provider", "apify")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });

  const map = new Map<string, {
    actualTotal: number; estimatedTotal: number; unavailable: number;
    runs: number; errors: number; results: number;
    hasActual: boolean; hasEstimated: boolean;
    lastAt: string | null; lastStatus: string | null; lastCost: number | null;
  }>();

  const ensure = (actor: string) => {
    if (!map.has(actor))
      map.set(actor, {
        actualTotal: 0, estimatedTotal: 0, unavailable: 0,
        runs: 0, errors: 0, results: 0,
        hasActual: false, hasEstimated: false,
        lastAt: null, lastStatus: null, lastCost: null,
      });
    return map.get(actor)!;
  };

  for (const a of KNOWN_APIFY_ACTORS) ensure(a);

  for (const row of logs ?? []) {
    const actor = String(row.actor ?? "apify/unknown");
    const acc = ensure(actor);
    const status = String(row.status);
    const isSuccess = status === "success" || status === "ok" || status === "cache";

    if (!isSuccess) {
      acc.errors += 1;
      if (row.actual_cost_usd != null) {
        acc.actualTotal += Number(row.actual_cost_usd);
        acc.hasActual = true;
      }
    } else {
      acc.runs += 1;
      acc.results += row.posts_returned ?? 0;
      if (row.actual_cost_usd != null) {
        acc.actualTotal += Number(row.actual_cost_usd);
        acc.hasActual = true;
      } else if (row.estimated_cost_usd != null) {
        acc.estimatedTotal += Number(row.estimated_cost_usd);
        acc.hasEstimated = true;
      } else {
        acc.unavailable += 1;
      }
    }

    if (acc.lastAt === null) {
      acc.lastAt = String(row.created_at);
      acc.lastStatus = status;
      acc.lastCost = row.actual_cost_usd != null ? Number(row.actual_cost_usd)
        : row.estimated_cost_usd != null ? Number(row.estimated_cost_usd) : null;
    }
  }

  const results: ApifyActorBreakdown[] = [];
  for (const [actor, acc] of map) {
    const totalCost = acc.actualTotal + acc.estimatedTotal;
    const costSource: ApifyActorBreakdown["cost_source"] =
      acc.runs === 0 && acc.errors === 0 ? "unavailable"
        : acc.hasActual && acc.hasEstimated ? "mixed"
        : acc.hasActual ? "actual"
        : acc.hasEstimated ? "estimated" : "unavailable";

    results.push({
      actor,
      label: APIFY_ACTOR_LABELS[actor] ?? actor.replace("apify/", "").replace(/-/g, " "),
      total_cost_usd: Number(totalCost.toFixed(4)),
      actual_total_usd: Number(acc.actualTotal.toFixed(4)),
      estimated_total_usd: Number(acc.estimatedTotal.toFixed(4)),
      unavailable_count: acc.unavailable,
      run_count: acc.runs,
      error_count: acc.errors,
      total_results: acc.results,
      avg_cost_per_run: acc.runs > 0 ? Number((totalCost / acc.runs).toFixed(4)) : null,
      cost_per_1k_results: acc.results >= 10 ? Number(((totalCost / acc.results) * 1000).toFixed(4)) : null,
      last_run_at: acc.lastAt,
      last_run_status: acc.lastStatus,
      last_run_cost_usd: acc.lastCost,
      cost_source: costSource,
      included_in_free_report: true,
    });
  }

  results.sort((a, b) => {
    const aK = KNOWN_APIFY_ACTORS.indexOf(a.actor);
    const bK = KNOWN_APIFY_ACTORS.indexOf(b.actor);
    if (aK >= 0 && bK >= 0) return aK - bK;
    if (aK >= 0) return -1;
    if (bK >= 0) return 1;
    return b.total_cost_usd - a.total_cost_usd;
  });

  return results;
}

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
  "COMMENT_SCRAPER_ENABLED",
  "COMMENT_SCRAPER_INTERNAL_TEST",
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

/**
 * Fonte única de verdade para custos: `provider_call_logs`.
 *
 * Regras uniformes (aplicadas por todos os ecrãs do /admin que mostram custos):
 *   - custo por linha = COALESCE(actual_cost_usd, estimated_cost_usd, 0)
 *   - apenas linhas com status IN ('success','cache') contam como custo realizado
 *   - janelas declaradas no UI; ambos os ecrãs (Sistema 24h e Visão Geral 30d)
 *     chamam esta função, garantindo que os números batem certo entre páginas
 *
 * `cost_daily` deixou de ser fonte primária — só é usada para reconciliação
 * Apify (faturação mensal real) e saldo DataForSEO.
 * Ver mem://features/cost-source-of-truth.
 */
export async function aggregateCostsFromLogs(sinceIso: string): Promise<{
  totals: Record<
    "apify" | "openai" | "dataforseo",
    { amount_usd: number; calls: number }
  >;
  daily: ExpenseDailyPoint[];
  apifyFreshSum: number;
  apifyFreshCount: number;
}> {
  const { data: logs } = await supabaseAdmin
    .from("provider_call_logs")
    .select("provider, actor, actual_cost_usd, estimated_cost_usd, status, created_at")
    .gte("created_at", sinceIso);

  const totals = {
    apify: { amount_usd: 0, calls: 0 },
    openai: { amount_usd: 0, calls: 0 },
    dataforseo: { amount_usd: 0, calls: 0 },
  };
  const dayMap = new Map<string, ExpenseDailyPoint>();
  let apifyFreshSum = 0;
  let apifyFreshCount = 0;

  for (const row of logs ?? []) {
    const provider = String(row.provider) as keyof typeof totals;
    if (!(provider in totals)) continue;
    const status = String(row.status);
    if (status !== "success" && status !== "cache") continue;

    const cost = Number(row.actual_cost_usd ?? row.estimated_cost_usd ?? 0);
    totals[provider].amount_usd += cost;
    totals[provider].calls += 1;

    const day = String(row.created_at).slice(0, 10);
    const point = dayMap.get(day) ?? { day, apify: 0, openai: 0, dataforseo: 0, apify_by_actor: {} };
    point[provider] = Number((point[provider] + cost).toFixed(6));

    if (provider === "apify") {
      const actor = String((row as Record<string, unknown>).actor ?? "unknown");
      if (!point.apify_by_actor) point.apify_by_actor = {};
      point.apify_by_actor[actor] = Number(((point.apify_by_actor[actor] ?? 0) + cost).toFixed(6));
    }

    dayMap.set(day, point);

    if (provider === "apify" && status === "success") {
      apifyFreshSum += cost;
      apifyFreshCount += 1;
    }
  }

  const daily = Array.from(dayMap.values()).sort((a, b) =>
    a.day.localeCompare(b.day),
  );

  return { totals, daily, apifyFreshSum, apifyFreshCount };
}

export async function fetchCostMetrics24h(): Promise<Cost24hMetrics> {
  const since = isoSinceHours(24);
  const { totals: acc, apifyFreshSum, apifyFreshCount } =
    await aggregateCostsFromLogs(since);

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
    apify_actors: await aggregateApifyActorBreakdown(since),
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
  // Fonte primária: provider_call_logs (mesma regra que /admin/sistema 24h),
  // garantindo que os totais batem certo entre páginas para a mesma janela.
  const sinceIso = new Date(Date.now() - 30 * DAY_MS).toISOString();
  const { totals, daily } = await aggregateCostsFromLogs(sinceIso);

  // cost_daily continua a existir só para extras de reconciliação:
  // saldo DataForSEO e faturação real Apify (monthly usage API).
  const startDay = dayKey(new Date(Date.now() - 30 * DAY_MS));
  const { data: dailyRows } = await supabaseAdmin
    .from("cost_daily")
    .select("provider, day, amount_usd, details")
    .gte("day", startDay);

  let dataforseoBalance: number | null = null;
  let apifyBilled = 0;
  let apifyHasBilled = false;
  for (const r of dailyRows ?? []) {
    const provider = String(r.provider);
    if (provider === "dataforseo") {
      const bal = (r.details as { balance_at_snapshot?: number } | null)
        ?.balance_at_snapshot;
      if (typeof bal === "number") dataforseoBalance = bal;
    }
    if (provider === "apify") {
      apifyBilled += Number(r.amount_usd ?? 0);
      apifyHasBilled = true;
    }
  }

  // Actor-level breakdown within Apify
  const apifyActors = await aggregateApifyActorBreakdown(sinceIso);

  return {
    apify_total: Number(totals.apify.amount_usd.toFixed(4)),
    openai_total: Number(totals.openai.amount_usd.toFixed(4)),
    dataforseo_total: Number(totals.dataforseo.amount_usd.toFixed(4)),
    total: Number(
      (
        totals.apify.amount_usd +
        totals.openai.amount_usd +
        totals.dataforseo.amount_usd
      ).toFixed(4),
    ),
    apify_calls: totals.apify.calls,
    openai_calls: totals.openai.calls,
    dataforseo_calls: totals.dataforseo.calls,
    dataforseo_balance: dataforseoBalance,
    daily,
    apify_billed_total_30d: apifyHasBilled
      ? Number(apifyBilled.toFixed(4))
      : null,
    apify_actors: apifyActors,
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

/* ============================================= Comment Scraper Metrics -- */

export interface CommentScraperMetrics {
  total_cost_usd: number;
  run_count: number;
  comments_returned: number;
  avg_cost_per_run: number | null;
  avg_cost_per_1k_comments: number | null;
  last_run_status: string | null;
  last_run_at: string | null;
  enabled: boolean;
  max_charge_usd: number;
  max_posts: number;
  /** Max total results (global) per run */
  max_total_results: number;
  /** Number of successful runs where actualCostUsd was null */
  null_cost_count: number;
  /** Total failed runs in the period */
  failure_count: number;
  /** Failures among last 3 runs */
  recent_failure_count: number;
  /** Actor name */
  actor: string;
  /** Include replies */
  include_replies: boolean;
  /** Timeout in ms */
  timeout_ms: number;
  /** Last run cost (null if unavailable) */
  last_run_cost_usd: number | null;
  /** Last run comments returned */
  last_run_comments: number;
  /** Target cost per analysis (informational) */
  target_cost_usd: number;
  /** Hard budget ceiling — env values above this are clamped */
  hard_max_cost_usd: number;
  /** Post selection rule */
  post_rule: "base_actor_posts_only";
  /** Whether env was clamped (raw value > $0.20) */
  env_was_clamped: boolean;
  /** Number of runs where cost exceeded target ($0.15) */
  runs_above_target: number;
  /** Number of runs where cost exceeded hard max ($0.20) */
  runs_above_hard_max: number;
}

const COMMENT_SCRAPER_ACTOR = "apify/instagram-comment-scraper";

export async function fetchCommentScraperMetrics(
  sinceIso: string,
): Promise<CommentScraperMetrics> {
  const enabled = process.env.COMMENT_SCRAPER_ENABLED === "true";

  // Read actual guardrail values from env (same logic as comment-scraper.server.ts)
  const maxChargeRaw = process.env.COMMENT_SCRAPER_MAX_CHARGE_USD;
  const maxCharge = maxChargeRaw ? Math.max(0.05, Math.min(0.20, parseFloat(maxChargeRaw) || 0.20)) : 0.20;
  const maxPostsRaw = process.env.COMMENT_SCRAPER_MAX_POSTS;
  const maxPosts = maxPostsRaw ? Math.max(1, Math.min(12, parseInt(maxPostsRaw, 10) || 12)) : 12;
  const maxTotalResultsRaw = process.env.COMMENT_SCRAPER_MAX_TOTAL_RESULTS;
  const maxTotalResults = maxTotalResultsRaw ? Math.max(5, Math.min(105, parseInt(maxTotalResultsRaw, 10) || 80)) : 80;

  const { data: logs } = await supabaseAdmin
    .from("provider_call_logs")
    .select(
      "id, status, actual_cost_usd, estimated_cost_usd, posts_returned, created_at",
    )
    .eq("actor", COMMENT_SCRAPER_ACTOR)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false });

  const rows = logs ?? [];

  let totalCost = 0;
  let totalComments = 0;
  let runCount = 0;
  let nullCostCount = 0;
  let failureCount = 0;

  for (const row of rows) {
    const status = String(row.status);
    if (status === "success" || status === "ok") {
      const cost = Number(row.actual_cost_usd ?? row.estimated_cost_usd ?? 0);
      totalCost += cost;
      totalComments += row.posts_returned ?? 0;
      runCount += 1;
      if (row.actual_cost_usd == null) nullCostCount += 1;
    } else {
      failureCount += 1;
      // Still count cost for failed runs if Apify charged
      if (row.actual_cost_usd != null) {
        totalCost += Number(row.actual_cost_usd);
      }
    }
  }

  const lastRun = rows[0] ?? null;
  // Failures among last 3 runs
  const recentFailureCount = rows.slice(0, 3).filter(
    (r) => String(r.status) !== "success" && String(r.status) !== "ok",
  ).length;

  // Count runs above thresholds
  let runsAboveTarget = 0;
  let runsAboveHardMax = 0;
  for (const row of rows) {
    const status = String(row.status);
    if (status === "success" || status === "ok") {
      const cost = Number(row.actual_cost_usd ?? 0);
      if (cost > 0.15) runsAboveTarget++;
      if (cost > 0.20) runsAboveHardMax++;
    }
  }

  const envWasClamped = maxChargeRaw != null && parseFloat(maxChargeRaw) > 0.20;

  return {
    total_cost_usd: Number(totalCost.toFixed(4)),
    run_count: runCount,
    comments_returned: totalComments,
    avg_cost_per_run: runCount > 0 ? Number((totalCost / runCount).toFixed(4)) : null,
    avg_cost_per_1k_comments:
      totalComments >= 10
        ? Number(((totalCost / totalComments) * 1000).toFixed(4))
        : null,
    last_run_status: lastRun ? String(lastRun.status) : null,
    last_run_at: lastRun ? String(lastRun.created_at) : null,
    enabled,
    max_charge_usd: maxCharge,
    max_posts: maxPosts,
    max_total_results: maxTotalResults,
    null_cost_count: nullCostCount,
    failure_count: failureCount,
    recent_failure_count: recentFailureCount,
    actor: COMMENT_SCRAPER_ACTOR,
    include_replies: true,
    timeout_ms: 120_000,
    last_run_cost_usd: lastRun
      ? (lastRun.actual_cost_usd != null ? Number(lastRun.actual_cost_usd) : null)
      : null,
    last_run_comments: lastRun ? (lastRun.posts_returned ?? 0) : 0,
    target_cost_usd: 0.15,
    hard_max_cost_usd: 0.20,
    post_rule: "base_actor_posts_only",
    env_was_clamped: envWasClamped,
    runs_above_target: runsAboveTarget,
    runs_above_hard_max: runsAboveHardMax,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Comment Enrichment Jobs
// ─────────────────────────────────────────────────────────────────────

export interface EnrichmentJobSummary {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
  recent_failures: Array<{
    id: string;
    handle: string;
    last_error: string | null;
    attempts: number;
    created_at: string;
    updated_at: string;
  }>;
}

export async function fetchEnrichmentJobSummary(): Promise<EnrichmentJobSummary> {
  // Count by status
  const { data: allJobs } = await supabaseAdmin
    .from("comment_enrichment_jobs")
    .select("id, status, handle, last_error, attempts, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = allJobs ?? [];
  let pending = 0;
  let processing = 0;
  let completed = 0;
  let failed = 0;

  for (const r of rows) {
    const s = String(r.status);
    if (s === "pending") pending++;
    else if (s === "processing") processing++;
    else if (s === "completed") completed++;
    else if (s === "failed") failed++;
  }

  const recentFailures = rows
    .filter((r) => String(r.status) === "failed")
    .slice(0, 5)
    .map((r) => ({
      id: String(r.id),
      handle: String(r.handle),
      last_error: r.last_error ? String(r.last_error) : null,
      attempts: Number(r.attempts ?? 0),
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
    }));

  return {
    pending,
    processing,
    completed,
    failed,
    total: rows.length,
    recent_failures: recentFailures,
  };
}
