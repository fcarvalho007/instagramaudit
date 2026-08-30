/**
 * Public analyze rate limit (server-only).
 *
 * Caps the number of FRESH provider calls per IP and per handle in a 24h
 * trailing window. Cache and stale fallback are not gated.
 *
 * Defaults:
 *   PUBLIC_MAX_FRESH_PER_IP_DAY     (default 10)
 *   PUBLIC_MAX_FRESH_PER_HANDLE_DAY (default 5)
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type RateLimitScope = "ip" | "handle";

export class RateLimitError extends Error {
  readonly scope: RateLimitScope;
  readonly count: number;
  readonly limit: number;
  constructor(scope: RateLimitScope, count: number, limit: number) {
    super(`Rate limit exceeded for ${scope}: ${count} >= ${limit}`);
    this.name = "RateLimitError";
    this.scope = scope;
    this.count = count;
    this.limit = limit;
  }
}

function readNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function getPublicMaxFreshPerIpDay(): number {
  return readNumber("PUBLIC_MAX_FRESH_PER_IP_DAY", 10);
}

export function getPublicMaxFreshPerHandleDay(): number {
  return readNumber("PUBLIC_MAX_FRESH_PER_HANDLE_DAY", 5);
}

interface AssertInput {
  ipHash: string | null | undefined;
  handle: string;
  network?: string;
  now?: Date;
}

async function countFreshSuccess(opts: {
  column: "request_ip_hash" | "handle";
  value: string;
  sinceIso: string;
  network?: string;
}): Promise<number> {
  let q = (supabaseAdmin as any)
    .from("analysis_events")
    .select("id", { count: "exact", head: true })
    .eq("data_source", "fresh")
    .eq("outcome", "success")
    .eq(opts.column, opts.value)
    .gte("created_at", opts.sinceIso);
  if (opts.network) q = q.eq("network", opts.network);
  const { count, error } = await q;
  if (error) {
    console.error(`[public-rate-limit] count query failed (${opts.column})`, error.message);
    return 0;
  }
  return count ?? 0;
}

/** Throws RateLimitError when IP or handle exceeds its 24h fresh quota. */
export async function assertWithinPublicRateLimit(input: AssertInput): Promise<void> {
  const now = input.now ?? new Date();
  const sinceIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const network = (input.network ?? "instagram").toLowerCase();
  const handle = input.handle.toLowerCase();

  const handleLimit = getPublicMaxFreshPerHandleDay();
  const handleCount = await countFreshSuccess({
    column: "handle",
    value: handle,
    sinceIso,
    network,
  });
  if (handleCount >= handleLimit) {
    throw new RateLimitError("handle", handleCount, handleLimit);
  }

  if (input.ipHash) {
    const ipLimit = getPublicMaxFreshPerIpDay();
    const ipCount = await countFreshSuccess({
      column: "request_ip_hash",
      value: input.ipHash,
      sinceIso,
    });
    if (ipCount >= ipLimit) {
      throw new RateLimitError("ip", ipCount, ipLimit);
    }
  }
}

/**
 * Limite dedicado ao baseline anónimo (PUBLIC_BASELINE_NO_EMAIL=true).
 *
 * Sem email não há lead nem crédito a travar o custo do provider: o único
 * limitador seria o cap global. Aplicamos um tecto por IP mais apertado do
 * que o limite geral, contando análises FRESH bem-sucedidas nas últimas 24h.
 *
 * `PUBLIC_ANON_MAX_FRESH_PER_IP_DAY` (default 3).
 */
export function getAnonymousMaxFreshPerIpDay(): number {
  return readNumber("PUBLIC_ANON_MAX_FRESH_PER_IP_DAY", 10);
}

/** Tecto horário, para travar rajadas sem penalizar uso normal ao dia. */
export function getAnonymousMaxFreshPerIpHour(): number {
  return readNumber("PUBLIC_ANON_MAX_FRESH_PER_IP_HOUR", 4);
}

export async function assertWithinAnonymousBaselineRateLimit(input: {
  ipHash: string | null | undefined;
  now?: Date;
}): Promise<void> {
  if (!input.ipHash) return;
  const now = input.now ?? new Date();
  const sinceIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const limit = getAnonymousMaxFreshPerIpDay();
  const count = await countFreshSuccess({
    column: "request_ip_hash",
    value: input.ipHash,
    sinceIso,
  });
  if (count >= limit) {
    throw new RateLimitError("ip", count, limit);
  }

  const hourLimit = getAnonymousMaxFreshPerIpHour();
  const hourSinceIso = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const hourCount = await countFreshSuccess({
    column: "request_ip_hash",
    value: input.ipHash,
    sinceIso: hourSinceIso,
  });
  if (hourCount >= hourLimit) {
    throw new RateLimitError("ip", hourCount, hourLimit);
  }
}
