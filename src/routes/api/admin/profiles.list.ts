/**
 * GET /api/admin/profiles/list — lista de perfis com totais e nº de reports.
 *
 * Devolve até 500 perfis ordenados por análises totais (desc) com agregação
 * de report_requests por instagram_username.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/profiles/list")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const [{ data: profiles, error: pErr }, { data: requests, error: rErr }] =
          await Promise.all([
            supabaseAdmin
              .from("social_profiles")
              .select(
                "handle, network, display_name, analyses_total, analyses_fresh, analyses_cache, followers_last_seen, last_analyzed_at, last_outcome",
              )
              .order("analyses_total", { ascending: false })
              .limit(500),
            supabaseAdmin
              .from("report_requests")
              .select("instagram_username, delivery_status")
              .limit(5000),
          ]);

        if (pErr || rErr) {
          return jsonResponse(
            { success: false, error_code: "QUERY_FAILED", message: (pErr ?? rErr)?.message },
            500,
          );
        }

        const reportsByHandle = new Map<string, number>();
        for (const r of requests ?? []) {
          const k = r.instagram_username.toLowerCase();
          reportsByHandle.set(k, (reportsByHandle.get(k) ?? 0) + 1);
        }

        const rows = (profiles ?? []).map((p) => {
          const reports = reportsByHandle.get(p.handle.toLowerCase()) ?? 0;
          const analyses = p.analyses_total ?? 0;
          return {
            handle: p.handle,
            network: p.network,
            display_name: p.display_name,
            analyses,
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
            with_reports: rows.filter((r) => r.reports > 0).length,
            repeated: rows.filter((r) => r.analyses >= 2).length,
            no_conversion: rows.filter((r) => r.reports === 0).length,
          },
        });
      },
    },
  },
});