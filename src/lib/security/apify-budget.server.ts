/**
 * Apify daily budget gate (server-only).
 *
 * Reads `provider_call_logs.estimated_cost_usd` for `provider='apify'` over
 * the trailing UTC day and blocks new fresh provider calls when the hard
 * cap is reached. Cache hits and stale fallback are NOT gated here — only
 * outbound provider spend.
 *
 * Defaults are intentionally conservative:
 *   APIFY_DAILY_CAP_USD  (default 5)  — soft warning threshold
 *   APIFY_HARD_CAP_USD   (default 10) — hard block threshold
 *
 * In-memory cache (60s) avoids re-summing on every request.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export class BudgetExceededError extends Error {
  readonly spentUsd: number;
  readonly capUsd: number;
  constructor(spentUsd: number, capUsd: number) {
    super(`Apify daily budget exceeded: $${spentUsd.toFixed(2)} >= $${capUsd}`);
    this.name = "BudgetExceededError";
    this.spentUsd = spentUsd;
    this.capUsd = capUsd;
  }
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getApifyDailyCapUsd(): number {
  return readNumber("APIFY_DAILY_CAP_USD", 5);
}

export function getApifyHardCapUsd(): number {
  return readNumber("APIFY_HARD_CAP_USD", 10);
}

/**
 * Dedicated daily cap for 90-day analysis windows (USD).
 *
 * Defaults to ~€5/day (5.5 USD). Operators can tune via
 * `APIFY_90D_DAILY_CAP_USD`. Trips `WINDOW_90D_BUDGET_EXCEEDED` at the
 * public endpoint before credit reservation and before the provider call.
 */
export function getApify90dDailyCapUsd(): number {
  return readNumber("APIFY_90D_DAILY_CAP_USD", 5.5);
}

export class Window90dBudgetExceededError extends Error {
  readonly spentUsd: number;
  readonly capUsd: number;
  constructor(spentUsd: number, capUsd: number) {
    super(
      `90d daily budget exceeded: $${spentUsd.toFixed(2)} >= $${capUsd}`,
    );
    this.name = "Window90dBudgetExceededError";
    this.spentUsd = spentUsd;
    this.capUsd = capUsd;
  }
}

/**
 * Per-(lead, profile, window) daily cap (USD).
 *
 * Protects per-paid-user margin on wide-window Pro analyses (30d/90d).
 * Defaults to ~€5/day (5.5 USD) and can be tuned via
 * `APIFY_PRO_WINDOW_PROFILE_DAILY_CAP_USD`. Cache hits (no provider call)
 * are NEVER gated by this cap — only fresh and `force_refresh` paths.
 */
export function getProWindowProfileDailyCapUsd(): number {
  return readNumber("APIFY_PRO_WINDOW_PROFILE_DAILY_CAP_USD", 5.5);
}

export class ProWindowBudgetExceededError extends Error {
  readonly spentUsd: number;
  readonly capUsd: number;
  readonly scope: { leadId: string; handle: string; window: "30d" | "90d" };
  constructor(
    spentUsd: number,
    capUsd: number,
    scope: { leadId: string; handle: string; window: "30d" | "90d" },
  ) {
    super(
      `Pro window daily budget exceeded for lead=${scope.leadId} handle=${scope.handle} window=${scope.window}: $${spentUsd.toFixed(2)} >= $${capUsd}`,
    );
    this.name = "ProWindowBudgetExceededError";
    this.spentUsd = spentUsd;
    this.capUsd = capUsd;
    this.scope = scope;
  }
}

let cachedSpend: { value: number; at: number } | null = null;
let cached90dSpend: { value: number; at: number } | null = null;
const cachedProWindowSpend = new Map<
  string,
  { value: number; at: number }
>();
const TTL_MS = 60_000;

export function invalidateApifyBudgetCache(): void {
  cachedSpend = null;
  cached90dSpend = null;
  cachedProWindowSpend.clear();
}

export function invalidateProWindowBudgetCache(): void {
  cachedProWindowSpend.clear();
}

function startOfUtcDayIso(now: Date = new Date()): string {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Returns total estimated Apify spend (USD) since 00:00 UTC today. */
export async function getApifyDailySpendUsd(now: Date = new Date()): Promise<number> {
  const ts = now.getTime();
  if (cachedSpend && ts - cachedSpend.at < TTL_MS) return cachedSpend.value;

  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("provider_call_logs")
      .select("estimated_cost_usd, actual_cost_usd")
      .eq("provider", "apify")
      .gte("created_at", startOfUtcDayIso(now))
      .limit(5000);
    if (error) {
      console.error("[apify-budget] sum query failed", error.message);
      cachedSpend = { value: 0, at: ts };
      return 0;
    }
    const total = (data ?? []).reduce((sum: number, r: any) => {
      // Prefer actual_cost_usd when present; fallback to estimate.
      const raw = r.actual_cost_usd ?? r.estimated_cost_usd ?? 0;
      const v = typeof raw === "string" ? Number.parseFloat(raw) : Number(raw);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
    cachedSpend = { value: total, at: ts };
    return total;
  } catch (err) {
    console.error("[apify-budget] unexpected", err);
    return 0;
  }
}

/** Throws BudgetExceededError when daily Apify spend ≥ hard cap. */
export async function assertApifyDailyBudgetAvailable(): Promise<void> {
  const cap = getApifyHardCapUsd();
  const spent = await getApifyDailySpendUsd();
  if (spent >= cap) throw new BudgetExceededError(spent, cap);
}

/**
 * Sum of estimated/actual Apify spend (USD) for 90d analysis windows since
 * 00:00 UTC today. Mirrors `getApifyDailySpendUsd` but filtered by
 * `analysis_window='90d'`. 60s in-memory cache (separate slot).
 */
export async function getApify90dDailySpendUsd(
  now: Date = new Date(),
): Promise<number> {
  const ts = now.getTime();
  if (cached90dSpend && ts - cached90dSpend.at < TTL_MS)
    return cached90dSpend.value;

  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("provider_call_logs")
      .select("estimated_cost_usd, actual_cost_usd")
      .eq("provider", "apify")
      .eq("analysis_window", "90d")
      .gte("created_at", startOfUtcDayIso(now))
      .limit(5000);
    if (error) {
      console.error("[apify-budget] 90d sum query failed", error.message);
      cached90dSpend = { value: 0, at: ts };
      return 0;
    }
    const total = (data ?? []).reduce((sum: number, r: any) => {
      const raw = r.actual_cost_usd ?? r.estimated_cost_usd ?? 0;
      const v = typeof raw === "string" ? Number.parseFloat(raw) : Number(raw);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
    cached90dSpend = { value: total, at: ts };
    return total;
  } catch (err) {
    console.error("[apify-budget] 90d unexpected", err);
    return 0;
  }
}

/**
 * Throws `Window90dBudgetExceededError` when today's 90d Apify spend has
 * reached the dedicated cap. Caller must place this check on the fresh-fetch
 * path only (cache hits must stay free and unblocked).
 */
export async function assertApify90dDailyBudgetAvailable(): Promise<void> {
  const cap = getApify90dDailyCapUsd();
  const spent = await getApify90dDailySpendUsd();
  if (spent >= cap) throw new Window90dBudgetExceededError(spent, cap);
}

/**
 * Sum of estimated Apify spend (USD) for one lead × handle × window since
 * 00:00 UTC today. Implementation walks `credit_ledger` (the only place
 * lead_id meets analysis_event_id) and joins back to `analysis_events`
 * filtered by handle + analysis_window. Cached per (lead, handle, window).
 */
export async function getProWindowProfileDailySpendUsd(input: {
  leadId: string;
  handle: string;
  window: "30d" | "90d";
  now?: Date;
}): Promise<number> {
  const now = input.now ?? new Date();
  const ts = now.getTime();
  const key = `${input.leadId}|${input.handle.toLowerCase()}|${input.window}`;
  const hit = cachedProWindowSpend.get(key);
  if (hit && ts - hit.at < TTL_MS) return hit.value;

  try {
    const sinceIso = startOfUtcDayIso(now);
    // Step 1: gather analysis_event_ids linked to confirm/reserve rows for
    // this lead since UTC midnight. `reserve` is included so an in-flight
    // forced refresh that hasn't confirmed yet still counts (defensive).
    const { data: ledgerRows, error: ledgerErr } = await (supabaseAdmin as any)
      .from("credit_ledger")
      .select("analysis_event_id")
      .eq("lead_id", input.leadId)
      .in("reason", ["confirm", "reserve"])
      .gte("created_at", sinceIso)
      .not("analysis_event_id", "is", null)
      .limit(2000);
    if (ledgerErr) {
      console.error(
        "[apify-budget] pro-window ledger query failed",
        ledgerErr.message,
      );
      cachedProWindowSpend.set(key, { value: 0, at: ts });
      return 0;
    }
    const eventIds = Array.from(
      new Set(
        (ledgerRows ?? [])
          .map((r: { analysis_event_id: string | null }) => r.analysis_event_id)
          .filter((v: string | null): v is string => !!v),
      ),
    );
    if (eventIds.length === 0) {
      cachedProWindowSpend.set(key, { value: 0, at: ts });
      return 0;
    }
    // Step 2: sum estimated_cost_usd for matching events.
    const { data: evRows, error: evErr } = await (supabaseAdmin as any)
      .from("analysis_events")
      .select("estimated_cost_usd")
      .in("id", eventIds)
      .eq("handle", input.handle.toLowerCase())
      .eq("analysis_window", input.window)
      .gte("created_at", sinceIso)
      .limit(2000);
    if (evErr) {
      console.error(
        "[apify-budget] pro-window events query failed",
        evErr.message,
      );
      cachedProWindowSpend.set(key, { value: 0, at: ts });
      return 0;
    }
    const total = (evRows ?? []).reduce((sum: number, r: any) => {
      const raw = r.estimated_cost_usd ?? 0;
      const v = typeof raw === "string" ? Number.parseFloat(raw) : Number(raw);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
    cachedProWindowSpend.set(key, { value: total, at: ts });
    return total;
  } catch (err) {
    console.error("[apify-budget] pro-window unexpected", err);
    return 0;
  }
}

/**
 * Throws `ProWindowBudgetExceededError` when the per-(lead, handle, window)
 * daily cap has been reached. Call ONLY on fresh/forced-refresh paths,
 * never on cache hits.
 */
export async function assertProWindowProfileDailyBudgetAvailable(input: {
  leadId: string;
  handle: string;
  window: "30d" | "90d";
}): Promise<void> {
  const cap = getProWindowProfileDailyCapUsd();
  const spent = await getProWindowProfileDailySpendUsd(input);
  if (spent >= cap) {
    throw new ProWindowBudgetExceededError(spent, cap, input);
  }
}
/**
 * Production-only Apify spend (USD) since 00:00 UTC today.
 *
 * Excludes `admin_lab` (Apify Lab / I&D) rows. Use this for a future
 * production-only budget warning — the hard cap deliberately stays on
 * the whole-table sum so Lab spend can also trip it.
 *
 * Not currently wired into the request gate — exported so admin diagnostics
 * can render "production budget headroom" separately from "total headroom".
 */
export async function getApifyProductionDailySpendUsd(
  now: Date = new Date(),
): Promise<number> {
  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("provider_call_logs")
      .select("estimated_cost_usd, actual_cost_usd")
      .eq("provider", "apify")
      .in("source_context", ["public_analysis", "enrich_comments"])
      .gte("created_at", startOfUtcDayIso(now))
      .limit(5000);
    if (error) {
      console.error("[apify-budget] production sum query failed", error.message);
      return 0;
    }
    return (data ?? []).reduce((sum: number, r: any) => {
      const raw = r.actual_cost_usd ?? r.estimated_cost_usd ?? 0;
      const v = typeof raw === "string" ? Number.parseFloat(raw) : Number(raw);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
  } catch (err) {
    console.error("[apify-budget] production unexpected", err);
    return 0;
  }
}
