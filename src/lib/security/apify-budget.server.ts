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

let cachedSpend: { value: number; at: number } | null = null;
const TTL_MS = 60_000;

export function invalidateApifyBudgetCache(): void {
  cachedSpend = null;
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
