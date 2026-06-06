/**
 * Server functions for reading/writing the analysis execution mode.
 */

import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  invalidateExecutionModeCache,
  type ExecutionMode,
} from "@/lib/admin/execution-mode.server";

export const getExecutionMode = createServerFn({ method: "GET" }).handler(
  async () => {
    const { data } = await supabaseAdmin
      .from("app_config")
      .select("value")
      .eq("key", "analysis_execution_mode")
      .maybeSingle();

    const mode: ExecutionMode = data?.value === "fresh" ? "fresh" : "cache_only";
    return { mode };
  },
);

export const setExecutionMode = createServerFn({ method: "POST" })
  .inputValidator((input: { mode: ExecutionMode }) => {
    if (input.mode !== "cache_only" && input.mode !== "fresh") {
      throw new Error("Invalid mode");
    }
    return input;
  })
  .handler(async ({ data }) => {
    await supabaseAdmin.from("app_config").upsert(
      {
        key: "analysis_execution_mode",
        value: data.mode,
        updated_at: new Date().toISOString(),
        updated_by: "admin",
      },
      { onConflict: "key" },
    );
    invalidateExecutionModeCache();
    return { mode: data.mode };
  });

export interface TestProfileStatus {
  handle: string;
  latestSnapshotDate: string | null;
  hasCachedReport: boolean;
  hasCaptionSemantic: boolean;
  hasCommentIntelligence: boolean;
  hasVisualCover: boolean;
  estimatedLastCostUsd: number | null;
  hasInsightsV1: boolean;
  hasInsightsV2: boolean;
  hasMarketSignals: boolean;
  enrichmentStatus: Record<string, string> | null;
  allEnrichmentsComplete: boolean;
  cacheReady: boolean;
  snapshotExpiresAt: string | null;
  latestSnapshotId: string | null;
  latestFreshCostTotal: number | null;
  latestEventId: string | null;
}

export const getTestProfileStatuses = createServerFn({ method: "GET" }).handler(
  async () => {
    const handles = ["frederico.m.carvalho", "martimsilvai"];
    const results: TestProfileStatus[] = [];

    for (const handle of handles) {
      // Find latest snapshot for this handle
      const { data: snap } = await supabaseAdmin
        .from("analysis_snapshots")
        .select("id, updated_at, expires_at, normalized_payload")
        .eq("instagram_username", handle)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const payload = snap?.normalized_payload as Record<string, unknown> | null;
      const enrichmentStatus = (payload?.enrichment_status as Record<string, string> | undefined) ?? null;
      const snapshotExpiresAt = snap?.expires_at ?? null;
      const notExpired = snapshotExpiresAt ? new Date(snapshotExpiresAt) > new Date() : false;

      // Check all enrichments complete
      let allEnrichmentsComplete = false;
      if (enrichmentStatus) {
        const coreTypes = ["dataforseo", "insights_v1", "insights_v2", "visual_cover", "caption_semantic"];
        allEnrichmentsComplete = coreTypes.every(
          (t) =>
            enrichmentStatus[t] === "success" ||
            enrichmentStatus[t] === "skipped" ||
            enrichmentStatus[t] === "skipped_free",
        );
      }

      // Get latest event cost
      const { data: evt } = await supabaseAdmin
        .from("analysis_events")
        .select("id, estimated_cost_usd")
        .eq("handle", handle)
        .eq("data_source", "fresh")
        .eq("outcome", "success")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Total cost from provider_call_logs for this event
      let latestFreshCostTotal: number | null = null;
      if (evt?.id) {
        const { data: costRows } = await supabaseAdmin
          .from("provider_call_logs")
          .select("estimated_cost_usd, actual_cost_usd")
          .eq("analysis_event_id", evt.id);
        if (costRows && costRows.length > 0) {
          latestFreshCostTotal = costRows.reduce((sum, r) => {
            const c =
              typeof r.actual_cost_usd === "number" ? r.actual_cost_usd :
              typeof r.estimated_cost_usd === "number" ? r.estimated_cost_usd : 0;
            return sum + c;
          }, 0);
        }
      }

      results.push({
        handle,
        latestSnapshotDate: snap?.updated_at ?? null,
        hasCachedReport: !!snap,
        hasCaptionSemantic: !!(
          payload?.caption_semantic_analysis &&
          typeof payload.caption_semantic_analysis === "object"
        ),
        hasCommentIntelligence: !!(
          payload?.comment_intelligence &&
          typeof payload.comment_intelligence === "object"
        ),
        hasVisualCover: !!(
          payload?.visual_cover_analysis &&
          typeof payload.visual_cover_analysis === "object"
        ),
        hasInsightsV1: !!(payload?.ai_insights_v1 && typeof payload.ai_insights_v1 === "object"),
        hasInsightsV2: !!(payload?.ai_insights_v2 && typeof payload.ai_insights_v2 === "object"),
        hasMarketSignals: !!(payload?.market_signals_free && typeof payload.market_signals_free === "object"),
        enrichmentStatus,
        allEnrichmentsComplete,
        cacheReady: notExpired && allEnrichmentsComplete && !!snap,
        snapshotExpiresAt,
        latestSnapshotId: snap?.id ?? null,
        latestFreshCostTotal,
        latestEventId: evt?.id ?? null,
        estimatedLastCostUsd:
          typeof evt?.estimated_cost_usd === "number"
            ? evt.estimated_cost_usd
            : null,
      });
    }

    return { profiles: results };
  },
);

export const expireSnapshotForHandle = createServerFn({ method: "POST" })
  .inputValidator((input: { handle: string }) => {
    if (!input.handle || typeof input.handle !== "string") {
      throw new Error("Invalid handle");
    }
    return input;
  })
  .handler(async ({ data }) => {
    // Set expires_at to now so next request treats it as expired
    const { error } = await supabaseAdmin
      .from("analysis_snapshots")
      .update({ expires_at: new Date().toISOString() })
      .eq("instagram_username", data.handle.toLowerCase());

    return { success: !error, error: error?.message ?? null };
  });