/**
 * Developer-oriented readiness check for the Supabase client.
 *
 * Not wired into runtime UI — intended for diagnostics, smoke tests,
 * or a future internal healthcheck endpoint.
 *
 * Usage:
 *   const { ok, error } = await checkSupabaseConnection();
 */

import { supabase } from "./client";

export interface SupabaseHealthResult {
  ok: boolean;
  error?: string;
}

/**
 * Performs a trivial round-trip query to confirm the client is configured
 * and the backend is reachable. Selects zero rows from a known public table
 * to avoid transferring data.
 */
export async function checkSupabaseConnection(): Promise<SupabaseHealthResult> {
  try {
    const { error } = await supabase
      .from("report_requests")
      .select("id", { head: true, count: "exact" })
      .limit(0);

    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message };
  }
}
