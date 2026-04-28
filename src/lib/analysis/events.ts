/**
 * Analytics writers for the analyze endpoint (server-only, best-effort).
 *
 * Wraps the `record_analysis_event` SQL function and the
 * `provider_call_logs` table so the route handler stays focused on the
 * user-facing flow. Every helper here MUST swallow its own errors — failing
 * to log analytics must never break the user response.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { sanitizeErrorExcerpt } from "./cost";

export type AnalysisOutcome =
  | "success"
  | "provider_error"
  | "not_found"
  | "blocked_allowlist"
  | "provider_disabled"
  | "invalid_input";

export type AnalysisDataSource = "fresh" | "cache" | "stale" | "none";

export interface RecordAnalysisEventInput {
  network?: string;
  handle: string;
  competitorHandles?: string[];
  cacheKey: string | null;
  dataSource: AnalysisDataSource;
  outcome: AnalysisOutcome;
  errorCode?: string | null;
  analysisSnapshotId?: string | null;
  providerCallLogId?: string | null;
  postsReturned?: number | null;
  profilesReturned?: number | null;
  estimatedCostUsd?: number | null;
  durationMs?: number | null;
  requestIpHash?: string | null;
  userAgentFamily?: string | null;
  displayName?: string | null;
  followersLastSeen?: number | null;
}

/**
 * Insert one row in `analysis_events` and upsert the matching `social_profiles`
 * rollup atomically via the `record_analysis_event` SQL function. Returns
 * the new event id, or null if logging failed.
 */
export async function recordAnalysisEvent(
  input: RecordAnalysisEventInput,
): Promise<string | null> {
  try {
    // The SQL function tolerates NULLs on optional params, but the generated
    // Supabase types mark them as non-nullable. Cast through unknown so we
    // can pass null explicitly without losing call-site type safety.
    const args = {
      p_network: input.network ?? "instagram",
      p_handle: input.handle,
      p_competitor_handles: (input.competitorHandles ?? []).map((c) =>
        c.toLowerCase(),
      ),
      p_cache_key: input.cacheKey,
      p_data_source: input.dataSource,
      p_outcome: input.outcome,
      p_error_code: input.errorCode ?? null,
      p_analysis_snapshot_id: input.analysisSnapshotId ?? null,
      p_provider_call_log_id: input.providerCallLogId ?? null,
      p_posts_returned: input.postsReturned ?? null,
      p_profiles_returned: input.profilesReturned ?? null,
      p_estimated_cost_usd: input.estimatedCostUsd ?? null,
      p_duration_ms: input.durationMs ?? null,
      p_request_ip_hash: input.requestIpHash ?? null,
      p_user_agent_family: input.userAgentFamily ?? null,
      p_display_name: input.displayName ?? null,
      p_followers_last_seen: input.followersLastSeen ?? null,
    } as unknown as Parameters<
      typeof supabaseAdmin.rpc<"record_analysis_event">
    >[1];
    const { data, error } = await supabaseAdmin.rpc(
      "record_analysis_event",
      args,
    );
    if (error) {
      console.error("[analytics] record_analysis_event failed", error.message);
      return null;
    }
    return (data as string | null) ?? null;
  } catch (err) {
    console.error("[analytics] record_analysis_event threw", err);
    return null;
  }
}

export type ProviderCallStatus =
  | "success"
  | "timeout"
  | "http_error"
  | "config_error"
  | "network_error";

export interface RecordProviderCallInput {
  network?: string;
  provider?: "apify" | "dataforseo" | "openai" | string;
  actor: string;
  handle: string;
  status: ProviderCallStatus;
  httpStatus?: number | null;
  durationMs?: number | null;
  postsReturned?: number;
  estimatedCostUsd?: number | null;
  actualCostUsd?: number | null;
  apifyRunId?: string | null;
  // Token-bearing providers (currently OpenAI). Optional so non-AI calls
  // stay null. The DB columns may not yet exist in every environment —
  // the writer below only sends these fields when they are non-null, so a
  // missing column produces no insert error for Apify/DataForSEO rows.
  model?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  errorMessage?: string | null;
}

/**
 * Append one row in `provider_call_logs`. Returns the new id, or null on
 * failure. Errors are sanitised to strip the Apify token before persistence.
 */
export async function recordProviderCall(
  input: RecordProviderCallInput,
): Promise<string | null> {
  try {
    // Build the insert payload conditionally: token columns are only added
    // to the row when the caller actually supplies them. This keeps the
    // writer compatible with environments where the migration adding
    // `model` / `*_tokens` has not yet been applied.
    const row: Record<string, unknown> = {
      network: input.network ?? "instagram",
      provider: input.provider ?? "apify",
      actor: input.actor,
      handle: input.handle.toLowerCase(),
      status: input.status,
      http_status: input.httpStatus ?? null,
      duration_ms: input.durationMs ?? null,
      posts_returned: input.postsReturned ?? 0,
      estimated_cost_usd: input.estimatedCostUsd ?? null,
      actual_cost_usd: input.actualCostUsd ?? null,
      apify_run_id: input.apifyRunId ?? null,
      error_excerpt: input.errorMessage
        ? sanitizeErrorExcerpt(input.errorMessage)
        : null,
    };
    if (input.model != null) row.model = input.model;
    if (input.promptTokens != null) row.prompt_tokens = input.promptTokens;
    if (input.completionTokens != null) row.completion_tokens = input.completionTokens;
    if (input.totalTokens != null) row.total_tokens = input.totalTokens;

    const { data, error } = await supabaseAdmin
      .from("provider_call_logs")
      .insert(row as never)
      .select("id")
      .single();
    if (error) {
      console.error("[analytics] provider_call_logs insert failed", error.message);
      return null;
    }
    return data?.id ?? null;
  } catch (err) {
    console.error("[analytics] provider_call_logs insert threw", err);
    return null;
  }
}