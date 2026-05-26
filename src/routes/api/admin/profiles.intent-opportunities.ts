/**
 * GET /api/admin/profiles/intent-opportunities?period=…
 *
 * Handles muito pesquisados na janela mas sem conversão para snapshot novo
 * OU sem lead (email submetido). Útil para perceber onde existe interesse
 * que não está a transformar-se em relatório.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import { resolvePeriod } from "@/lib/admin/period";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const MIN_SEARCHES = 3;
const LIMIT = 20;

export const Route = createFileRoute("/api/admin/profiles/intent-opportunities")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const url = new URL(request.url);
        const { sinceISO } = resolvePeriod(url.searchParams.get("period"));

        const [{ data: events, error: eErr }, { data: snapshots }, { data: reqs }] =
          await Promise.all([
            supabaseAdmin
              .from("analysis_events")
              .select("handle, created_at, data_source, analysis_snapshot_id")
              .gte("created_at", sinceISO)
              .limit(10000),
            supabaseAdmin
              .from("analysis_snapshots")
              .select("instagram_username")
              .gte("created_at", sinceISO)
              .limit(5000),
            supabaseAdmin
              .from("report_requests")
              .select("instagram_username, lead_id")
              .gte("created_at", sinceISO)
              .limit(5000),
          ]);

        if (eErr) {
          return jsonResponse(
            { success: false, error_code: "QUERY_FAILED", message: eErr.message },
            500,
          );
        }

        type Agg = { handle: string; searches: number; last_search_at: string; fresh: number };
        const byHandle = new Map<string, Agg>();
        for (const e of events ?? []) {
          const k = e.handle.toLowerCase();
          const cur = byHandle.get(k) ?? {
            handle: k,
            searches: 0,
            last_search_at: e.created_at,
            fresh: 0,
          };
          cur.searches += 1;
          if (e.created_at > cur.last_search_at) cur.last_search_at = e.created_at;
          if (e.data_source === "fresh") cur.fresh += 1;
          byHandle.set(k, cur);
        }

        const snapHandles = new Set(
          (snapshots ?? []).map((s) => s.instagram_username.toLowerCase()),
        );
        const leadHandles = new Set(
          (reqs ?? [])
            .filter((r) => r.lead_id != null)
            .map((r) => r.instagram_username.toLowerCase()),
        );

        const rows = Array.from(byHandle.values())
          .filter((a) => a.searches >= MIN_SEARCHES)
          .map((a) => ({
            handle: a.handle,
            searches: a.searches,
            last_search_at: a.last_search_at,
            has_snapshot: snapHandles.has(a.handle),
            has_lead: leadHandles.has(a.handle),
          }))
          // Oportunidade = pesquisa repetida sem lead (mais valioso) ou sem snapshot.
          .filter((r) => !r.has_lead || !r.has_snapshot)
          .sort((a, b) => b.searches - a.searches)
          .slice(0, LIMIT);

        return jsonResponse({ success: true, rows, total: rows.length });
      },
    },
  },
});