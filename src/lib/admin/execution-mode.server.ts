/**
 * Server-side execution mode guard.
 *
 * Reads `analysis_execution_mode` from `app_config` and provides helpers
 * to prevent accidental API spending when mode is "cache_only".
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type ExecutionMode = "cache_only" | "fresh";

let cachedMode: ExecutionMode | null = null;
let cachedAt = 0;
const TTL_MS = 30_000; // 30s in-memory cache

/**
 * Read the current execution mode from app_config.
 * Defaults to "cache_only" for safety if no row exists.
 */
export async function getAnalysisExecutionMode(): Promise<ExecutionMode> {
  const now = Date.now();
  if (cachedMode && now - cachedAt < TTL_MS) return cachedMode;

  try {
    const { data } = await supabaseAdmin
      .from("app_config")
      .select("value")
      .eq("key", "analysis_execution_mode")
      .maybeSingle();

    const raw = data?.value;
    cachedMode = raw === "fresh" ? "fresh" : "cache_only";
  } catch (err) {
    console.error("[execution-mode] failed to read app_config, defaulting to cache_only", err);
    cachedMode = "cache_only";
  }
  cachedAt = now;
  return cachedMode;
}

/** Force-clear the in-memory cache (used after admin toggles the mode). */
export function invalidateExecutionModeCache(): void {
  cachedMode = null;
  cachedAt = 0;
}

export class CacheOnlyBlockedError extends Error {
  readonly provider: string;
  readonly context: string;
  constructor(provider: string, context: string) {
    super(`Blocked by cache_only mode: ${provider} (${context})`);
    this.name = "CacheOnlyBlockedError";
    this.provider = provider;
    this.context = context;
  }
}

/**
 * Throws CacheOnlyBlockedError if current mode is "cache_only".
 * Call this before every paid provider invocation.
 */
export async function assertFreshModeAllowed(
  provider: "apify" | "openai" | "dataforseo",
  context: string,
): Promise<void> {
  const mode = await getAnalysisExecutionMode();
  if (mode === "cache_only") {
    throw new CacheOnlyBlockedError(provider, context);
  }
}