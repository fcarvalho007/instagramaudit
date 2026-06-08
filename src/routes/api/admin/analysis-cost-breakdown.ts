/**
 * GET /api/admin/analysis-cost-breakdown
 *
 * Returns the last N fresh analysis events with full provider call cost
 * breakdown. Admin-only.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

interface ProviderCallRow {
  id: string;
  provider: string;
  actor: string;
  status: string;
  estimated_cost_usd: number | null;
  actual_cost_usd: number | null;
  duration_ms: number | null;
  posts_returned: number;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  created_at: string;
}

interface AnalysisBreakdown {
  event_id: string;
  handle: string;
  created_at: string;
  data_source: string;
  outcome: string;
  snapshot_id: string | null;
  analysis_window: string | null;
  cache_key: string | null;
  calls: ProviderCallRow[];
  totals: {
    estimated_usd: number;
    actual_usd: number | null;
    has_actual: boolean;
    call_count: number;
    linked_count: number;
    linkage_pct: number;
    apify_base_usd: number;
    comment_scraper_usd: number;
    openai_usd: number;
    dataforseo_usd: number;
    comment_scraper_status: "success" | "error" | "not_run";
    comments_returned: number;
  };
  enrichment_summary: Record<string, string> | null;
  all_enrichments_complete: boolean;
  snapshot_expires_at: string | null;
  enrichment_history: Record<string, { total: number; failed: number }> | null;
}

export const Route = createFileRoute("/api/admin/analysis-cost-breakdown")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdminSession();
        } catch (err) {
          if (err instanceof Response) return err;
          return new Response("Unauthorized", { status: 401 });
        }

        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit")) || 20, 50);

        // Get recent fresh analysis events
        const { data: events, error: evErr } = await supabaseAdmin
          .from("analysis_events")
          .select("id, handle, created_at, data_source, outcome, analysis_snapshot_id, analysis_window, cache_key")
          .eq("data_source", "fresh")
          .order("created_at", { ascending: false })
          .limit(limit);

        if (evErr) {
          return Response.json({ error: evErr.message }, { status: 500 });
        }

        const results: AnalysisBreakdown[] = [];

        for (const ev of events ?? []) {
          // Strategy: first try analysis_event_id link, fallback to time-window
          let calls: ProviderCallRow[] = [];
          let linkedCount = 0;

          const { data: linked } = await supabaseAdmin
            .from("provider_call_logs")
            .select("id, provider, actor, status, estimated_cost_usd, actual_cost_usd, duration_ms, posts_returned, model, prompt_tokens, completion_tokens, total_tokens, created_at")
            .eq("analysis_event_id", ev.id)
            .order("created_at", { ascending: true });

          if (linked && linked.length > 0) {
            calls = linked as ProviderCallRow[];
            linkedCount = calls.length;
          } else {
            // Fallback: time-window correlation (±60s)
            const evTime = new Date(ev.created_at);
            const windowStart = new Date(evTime.getTime() - 60_000).toISOString();
            const windowEnd = new Date(evTime.getTime() + 60_000).toISOString();

            const { data: correlated } = await supabaseAdmin
              .from("provider_call_logs")
              .select("id, provider, actor, status, estimated_cost_usd, actual_cost_usd, duration_ms, posts_returned, model, prompt_tokens, completion_tokens, total_tokens, created_at")
              .eq("handle", ev.handle)
              .gte("created_at", windowStart)
              .lte("created_at", windowEnd)
              .order("created_at", { ascending: true });

            if (correlated) calls = correlated as ProviderCallRow[];
            linkedCount = 0; // fallback = unlinked
          }

          // Enrichment summary from enrichment_jobs for this snapshot
          let enrichmentSummary: Record<string, string> | null = null;
          let allEnrichmentsComplete = false;
          let snapshotExpiresAt: string | null = null;
          let enrichmentHistory: Record<string, { total: number; failed: number }> | null = null;

          if (ev.analysis_snapshot_id) {
            const { data: ejRows } = await supabaseAdmin
              .from("enrichment_jobs")
              .select("enrichment_type, status")
              .eq("snapshot_id", ev.analysis_snapshot_id)
              .order("created_at", { ascending: false });

            if (ejRows && ejRows.length > 0) {
              // Take latest status per type
              const map: Record<string, string> = {};
              const histMap: Record<string, { total: number; failed: number }> = {};
              for (const r of ejRows) {
                const t = r.enrichment_type as string;
                if (!map[t]) map[t] = r.status as string;
                if (!histMap[t]) histMap[t] = { total: 0, failed: 0 };
                histMap[t].total += 1;
                if (r.status === "error") histMap[t].failed += 1;
              }
              enrichmentSummary = map;
              const statuses = Object.values(map);
              allEnrichmentsComplete =
                statuses.length >= 5 &&
                statuses.every(
                  (s) => s === "success" || s === "skipped" || s === "skipped_free",
                );
              // Only keep types with past failures
              for (const k of Object.keys(histMap)) {
                if (histMap[k].failed === 0) delete histMap[k];
              }
              enrichmentHistory = Object.keys(histMap).length > 0 ? histMap : null;
            }

            const { data: snapRow } = await supabaseAdmin
              .from("analysis_snapshots")
              .select("expires_at")
              .eq("id", ev.analysis_snapshot_id)
              .maybeSingle();
            snapshotExpiresAt = snapRow?.expires_at ?? null;
          }

          // Compute totals
          let estimatedTotal = 0;
          let actualTotal: number | null = null;
          let hasActual = false;
          let apifyBase = 0;
          let commentScraper = 0;
          let openai = 0;
          let dataforseo = 0;
          let commentScraperStatus: "success" | "error" | "not_run" = "not_run";
          let commentsReturned = 0;

          for (const c of calls) {
            const est = typeof c.estimated_cost_usd === "number" ? c.estimated_cost_usd : 0;
            estimatedTotal += est;

            if (c.actual_cost_usd !== null && c.actual_cost_usd !== undefined) {
              hasActual = true;
              actualTotal = (actualTotal ?? 0) + (typeof c.actual_cost_usd === "number" ? c.actual_cost_usd : 0);
            }

            if (c.actor === "apify/instagram-scraper") {
              apifyBase += est;
            } else if (c.actor === "apify/instagram-comment-scraper") {
              commentScraper += est;
              commentScraperStatus = c.status === "success" ? "success" : "error";
              commentsReturned += c.posts_returned;
            } else if (c.provider === "openai") {
              openai += est;
            } else if (c.provider === "dataforseo") {
              dataforseo += est;
            }
          }

          results.push({
            event_id: ev.id,
            handle: ev.handle,
            created_at: ev.created_at,
            data_source: ev.data_source,
            outcome: ev.outcome,
            snapshot_id: ev.analysis_snapshot_id,
            analysis_window: ev.analysis_window ?? null,
            cache_key: ev.cache_key ?? null,
            calls,
            totals: {
              estimated_usd: estimatedTotal,
              actual_usd: hasActual ? actualTotal : null,
              has_actual: hasActual,
              call_count: calls.length,
              linked_count: linkedCount,
              linkage_pct: calls.length > 0 ? Math.round((linkedCount / calls.length) * 100) : 100,
              apify_base_usd: apifyBase,
              comment_scraper_usd: commentScraper,
              openai_usd: openai,
              dataforseo_usd: dataforseo,
              comment_scraper_status: commentScraperStatus,
              comments_returned: commentsReturned,
            },
            enrichment_summary: enrichmentSummary,
            all_enrichments_complete: allEnrichmentsComplete,
            snapshot_expires_at: snapshotExpiresAt,
            enrichment_history: enrichmentHistory,
          });
        }

        return Response.json({ analyses: results });
      },
    },
  },
});