/**
 * Lovable AI Gateway daily budget gate (server-only).
 *
 * Mirrors `openai-budget.server.ts`. Sums `provider_call_logs` for
 * `provider='lovable_ai'` over the trailing UTC day and blocks new
 * outbound Lovable AI Gateway calls when the daily cap is reached.
 *
 * Default cap:
 *   LOVABLE_AI_DAILY_CAP_USD  (default 5)
 *
 * In-memory cache (60s) avoids re-summing on every request. A rapid
 * burst within a 60s window can briefly exceed the cap; this matches
 * OpenAI behaviour and is acceptable at a $5/day cap.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export class LovableAiBudgetExceededError extends Error {
  readonly spentUsd: number;
  readonly capUsd: number;
  constructor(spentUsd: number, capUsd: number) {
    super(`Lovable AI daily budget exceeded: $${spentUsd.toFixed(2)} >= $${capUsd}`);
    this.name = "LovableAiBudgetExceededError";
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

export function getLovableAiDailyCapUsd(): number {
  return readNumber("LOVABLE_AI_DAILY_CAP_USD", 5);
}

let cachedSpend: { value: number; at: number } | null = null;
const TTL_MS = 60_000;

export function invalidateLovableAiBudgetCache(): void {
  cachedSpend = null;
}

function startOfUtcDayIso(now: Date = new Date()): string {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Returns total Lovable AI spend (USD) since 00:00 UTC today. */
export async function getLovableAiDailySpendUsd(now: Date = new Date()): Promise<number> {
  const ts = now.getTime();
  if (cachedSpend && ts - cachedSpend.at < TTL_MS) return cachedSpend.value;

  try {
    const { data, error } = await (supabaseAdmin as any)
      .from("provider_call_logs")
      .select("estimated_cost_usd, actual_cost_usd")
      .eq("provider", "lovable_ai")
      .gte("created_at", startOfUtcDayIso(now))
      .limit(5000);
    if (error) {
      console.error("[lovable-ai-budget] sum query failed", error.message);
      cachedSpend = { value: 0, at: ts };
      return 0;
    }
    const total = (data ?? []).reduce((sum: number, r: any) => {
      const raw = r.actual_cost_usd ?? r.estimated_cost_usd ?? 0;
      const v = typeof raw === "string" ? Number.parseFloat(raw) : Number(raw);
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);
    cachedSpend = { value: total, at: ts };
    return total;
  } catch (err) {
    console.error("[lovable-ai-budget] unexpected", err);
    return 0;
  }
}

/** Throws LovableAiBudgetExceededError when daily Lovable AI spend ≥ cap. */
export async function assertLovableAiDailyBudgetAvailable(): Promise<void> {
  const cap = getLovableAiDailyCapUsd();
  const spent = await getLovableAiDailySpendUsd();
  if (spent >= cap) throw new LovableAiBudgetExceededError(spent, cap);
}