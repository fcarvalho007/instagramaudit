/**
 * GET /api/admin/profiles/list — lista de perfis com totais e nº de reports.
 *
 * Devolve até 500 perfis ordenados por análises totais (desc) com agregação
 * de snapshots por instagram_username dentro da janela `?period=`.
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

export const Route = createFileRoute("/api/admin/profiles/list")({
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

        const [{ data: profiles, error: pErr }, { data: snapshots, error: sErr }] =
          await Promise.all([
            supabaseAdmin
              .from("social_profiles")
              .select(
                "handle, network, display_name, analyses_total, analyses_fresh, analyses_cache, followers_last_seen, last_analyzed_at, last_outcome",
              )
              .order("analyses_total", { ascending: false })
              .limit(500),
            supabaseAdmin
              .from("analysis_snapshots")
              .select("instagram_username, created_at")
              .gte("created_at", sinceISO)
              .limit(10000),
          ]);

        if (pErr || sErr) {
          return jsonResponse(
            { success: false, error_code: "QUERY_FAILED", message: (pErr ?? sErr)?.message },
            500,
          );
        }

        // Contagens na janela a partir de analysis_snapshots (1 snapshot = 1 relatório).
        const snapshotsByHandle = new Map<string, number>();
        for (const s of snapshots ?? []) {
          const k = s.instagram_username.toLowerCase();
          snapshotsByHandle.set(k, (snapshotsByHandle.get(k) ?? 0) + 1);
        }

        const rows = (profiles ?? []).map((p) => {
          const inWindow = snapshotsByHandle.get(p.handle.toLowerCase()) ?? 0;
          const reports = inWindow;
          const analyses = inWindow;
          return {
            handle: p.handle,
            network: p.network,
            display_name: p.display_name,
            analyses,
            analyses_in_window: inWindow,
            analyses_lifetime: p.analyses_total ?? 0,
            analyses_fresh: p.analyses_fresh ?? 0,
            analyses_cache: p.analyses_cache ?? 0,
            followers_last_seen: p.followers_last_seen,
            last_analyzed_at: p.last_analyzed_at,
            last_outcome: p.last_outcome,
            reports,
            conversion_pct: analyses > 0 ? (reports / analyses) * 100 : 0,
          };
        });

        return jsonResponse({
          success: true,
          rows,
          total: rows.length,
          counts: {
            all: rows.length,
            with_reports: rows.filter((r) => r.analyses_in_window > 0).length,
            repeated: rows.filter((r) => r.analyses_in_window >= 2).length,
            no_conversion: rows.filter((r) => r.analyses_in_window === 0).length,
          },
        });
      },
    },
  },
});