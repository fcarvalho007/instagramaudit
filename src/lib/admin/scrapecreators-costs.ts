/**
 * ScrapeCreators — modelo de custo baseado em CRÉDITOS (não USD).
 *
 * Três conceitos distintos e nunca misturados:
 *   • credits_consumed      → soma de `provider_call_logs.credits_charged`
 *   • actual_cash_cost_usd  → $0 enquanto os créditos forem promocionais
 *   • equivalent_cost_usd   → créditos × custo/crédito do tarifário
 *
 * Funções puras — testáveis sem base de dados nem chamadas ao provider.
 */

/** Custo por crédito do pack Freelance ($47 / 25 000 créditos). */
export const SCRAPECREATORS_LIST_COST_PER_CREDIT_USD = 47 / 25_000;

/** Endpoints já substituídos — presença indica código/probe desactualizado. */
export const DEPRECATED_SCRAPECREATORS_ENDPOINTS = [
  "/v1/instagram/post/comments",
];

/** `source_context` considerados produção (entram em custo/lead e margem). */
export const PRODUCTION_CONTEXTS = ["public_analysis", "enrich_comments"];

export interface ScrapeCreatorsLogRow {
  endpoint: string | null;
  status: string | null;
  cached: boolean | null;
  credits_charged: number | null;
  credits_remaining: number | null;
  source_context: string | null;
  duration_ms: number | null;
  analysis_event_id: string | null;
  created_at: string;
}

export interface WindowTotals {
  calls: number;
  credits: number;
  success_calls: number;
  error_calls: number;
  cached_calls: number;
  equivalent_cost_usd: number;
  /** Custo efectivo em dinheiro. Zero durante a fase promocional. */
  actual_cash_cost_usd: number;
}

export interface EndpointTotals extends WindowTotals {
  endpoint: string;
  deprecated: boolean;
  avg_duration_ms: number | null;
  last_call_at: string | null;
}

export interface LastKnownBalance {
  credits_remaining: number;
  observed_at: string;
  age_seconds: number;
}

export type ReconciliationStatus = "green" | "amber" | "red" | "unknown";

export interface ScrapeCreatorsCostSummary {
  cost_per_credit_usd: number;
  promotional: boolean;
  windows: {
    last_24h: WindowTotals;
    last_7d: WindowTotals;
    last_30d: WindowTotals;
    all_time: WindowTotals;
  };
  production_30d: WindowTotals;
  lab_30d: WindowTotals;
  by_endpoint_30d: EndpointTotals[];
  deprecated_endpoint_calls_30d: number;
  last_known_balance: LastKnownBalance | null;
  last_call_at: string | null;
  reconciliation: {
    /** Saldo esperado a partir do último saldo observado menos créditos posteriores. */
    expected_credits_remaining: number | null;
    delta_credits: number | null;
    status: ReconciliationStatus;
  };
  unit_economics_30d: {
    credits_per_fresh_audit: number | null;
    credits_per_comment_unlock: number | null;
    equivalent_cost_per_fresh_audit_usd: number | null;
  };
}

const DAY_MS = 86_400_000;

function emptyTotals(): WindowTotals {
  return {
    calls: 0,
    credits: 0,
    success_calls: 0,
    error_calls: 0,
    cached_calls: 0,
    equivalent_cost_usd: 0,
    actual_cash_cost_usd: 0,
  };
}

function round(n: number, digits = 4): number {
  return Number(n.toFixed(digits));
}

function accumulate(
  target: WindowTotals,
  row: ScrapeCreatorsLogRow,
  costPerCredit: number,
  promotional: boolean,
): void {
  const credits = Number(row.credits_charged ?? 0);
  target.calls += 1;
  target.credits += credits;
  if ((row.status ?? "") === "success") target.success_calls += 1;
  else target.error_calls += 1;
  if (row.cached === true) target.cached_calls += 1;
  target.equivalent_cost_usd = round(target.credits * costPerCredit, 6);
  target.actual_cash_cost_usd = promotional
    ? 0
    : round(target.credits * costPerCredit, 6);
}

export function isDeprecatedEndpoint(endpoint: string | null): boolean {
  return DEPRECATED_SCRAPECREATORS_ENDPOINTS.includes(endpoint ?? "");
}

export function isProductionContext(context: string | null): boolean {
  return PRODUCTION_CONTEXTS.includes(context ?? "");
}

export function equivalentCostUsd(credits: number, costPerCredit: number): number {
  if (!Number.isFinite(credits) || credits <= 0) return 0;
  return round(credits * costPerCredit, 6);
}

export interface AggregateOptions {
  /** USD por crédito segundo o tarifário. */
  costPerCreditUsd: number;
  /** True enquanto os créditos em uso forem promocionais (custo efectivo $0). */
  promotional: boolean;
  /** Instante de referência (default: agora). */
  now?: number;
  /** Auditorias fresh (analysis_events) nos últimos 30 dias, para unit economics. */
  freshAudits30d?: number;
  /** Unlocks de Comment Intelligence nos últimos 30 dias. */
  commentUnlocks30d?: number;
}

export function aggregateScrapeCreatorsCosts(
  rows: ScrapeCreatorsLogRow[],
  opts: AggregateOptions,
): ScrapeCreatorsCostSummary {
  const now = opts.now ?? Date.now();
  const costPerCredit = Number.isFinite(opts.costPerCreditUsd)
    ? Math.max(0, opts.costPerCreditUsd)
    : 0;
  const promotional = opts.promotional;

  const windows = {
    last_24h: emptyTotals(),
    last_7d: emptyTotals(),
    last_30d: emptyTotals(),
    all_time: emptyTotals(),
  };
  const production30d = emptyTotals();
  const lab30d = emptyTotals();
  const endpointMap = new Map<string, EndpointTotals>();

  let lastKnownBalance: LastKnownBalance | null = null;
  let lastCallAt: string | null = null;
  let deprecatedCalls30d = 0;
  let creditsAfterBalanceObservation = 0;

  const sorted = [...rows].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
  );

  for (const row of sorted) {
    const ts = Date.parse(row.created_at);
    const age = now - ts;

    accumulate(windows.all_time, row, costPerCredit, promotional);
    if (age <= 30 * DAY_MS) accumulate(windows.last_30d, row, costPerCredit, promotional);
    if (age <= 7 * DAY_MS) accumulate(windows.last_7d, row, costPerCredit, promotional);
    if (age <= DAY_MS) accumulate(windows.last_24h, row, costPerCredit, promotional);

    if (age <= 30 * DAY_MS) {
      accumulate(
        isProductionContext(row.source_context) ? production30d : lab30d,
        row,
        costPerCredit,
        promotional,
      );

      const endpoint = row.endpoint ?? "desconhecido";
      let bucket = endpointMap.get(endpoint);
      if (!bucket) {
        bucket = {
          endpoint,
          deprecated: isDeprecatedEndpoint(row.endpoint),
          avg_duration_ms: null,
          last_call_at: null,
          ...emptyTotals(),
        };
        endpointMap.set(endpoint, bucket);
      }
      const prevCalls = bucket.calls;
      const prevAvg = bucket.avg_duration_ms ?? 0;
      accumulate(bucket, row, costPerCredit, promotional);
      if (typeof row.duration_ms === "number") {
        bucket.avg_duration_ms = Math.round(
          (prevAvg * prevCalls + row.duration_ms) / bucket.calls,
        );
      }
      bucket.last_call_at = row.created_at;
      if (bucket.deprecated) deprecatedCalls30d += 1;
    }

    if (typeof row.credits_remaining === "number") {
      lastKnownBalance = {
        credits_remaining: row.credits_remaining,
        observed_at: row.created_at,
        age_seconds: Math.max(0, Math.round((now - ts) / 1000)),
      };
      creditsAfterBalanceObservation = 0;
    } else {
      creditsAfterBalanceObservation += Number(row.credits_charged ?? 0);
    }

    lastCallAt = row.created_at;
  }

  const expected =
    lastKnownBalance === null
      ? null
      : lastKnownBalance.credits_remaining - creditsAfterBalanceObservation;

  const freshAudits = opts.freshAudits30d ?? 0;
  const unlocks = opts.commentUnlocks30d ?? 0;
  const profileCredits = [...endpointMap.values()]
    .filter((e) => !e.endpoint.includes("comments"))
    .reduce((s, e) => s + e.credits, 0);
  const commentCredits = [...endpointMap.values()]
    .filter((e) => e.endpoint.includes("comments"))
    .reduce((s, e) => s + e.credits, 0);

  return {
    cost_per_credit_usd: costPerCredit,
    promotional,
    windows,
    production_30d: production30d,
    lab_30d: lab30d,
    by_endpoint_30d: [...endpointMap.values()].sort((a, b) => b.credits - a.credits),
    deprecated_endpoint_calls_30d: deprecatedCalls30d,
    last_known_balance: lastKnownBalance,
    last_call_at: lastCallAt,
    reconciliation: {
      expected_credits_remaining: expected,
      delta_credits: expected === null ? null : creditsAfterBalanceObservation,
      status: reconciliationStatus(creditsAfterBalanceObservation, lastKnownBalance !== null),
    },
    unit_economics_30d: {
      credits_per_fresh_audit:
        freshAudits > 0 ? round(profileCredits / freshAudits, 2) : null,
      credits_per_comment_unlock:
        unlocks > 0 ? round(commentCredits / unlocks, 2) : null,
      equivalent_cost_per_fresh_audit_usd:
        freshAudits > 0
          ? equivalentCostUsd(profileCredits / freshAudits, costPerCredit)
          : null,
    },
  };
}

export function reconciliationStatus(
  deltaCredits: number,
  hasBalance: boolean,
): ReconciliationStatus {
  if (!hasBalance) return "unknown";
  const abs = Math.abs(deltaCredits);
  if (abs === 0) return "green";
  if (abs <= 2) return "amber";
  return "red";
}
