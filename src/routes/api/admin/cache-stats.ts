/**
 * GET /api/admin/cache-stats?period=…
 *
 * Devolve agregados de cache hits na janela: total de analysis_events,
 * quantos vieram de cache, e a hit rate em %.
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

export const Route = createFileRoute("/api/admin/cache-stats")({
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
        const { sinceISO, days } = resolvePeriod(url.searchParams.get("period"));

        const [totalRes, cacheRes] = await Promise.all([
          supabaseAdmin
            .from("analysis_events")
            .select("*", { count: "exact", head: true })
            .gte("created_at", sinceISO),
          supabaseAdmin
            .from("analysis_events")
            .select("*", { count: "exact", head: true })
            .gte("created_at", sinceISO)
            .eq("data_source", "cache"),
        ]);

        if (totalRes.error || cacheRes.error) {
          return jsonResponse(
            {
              success: false,
              error_code: "QUERY_FAILED",
              message: (totalRes.error ?? cacheRes.error)?.message,
            },
            500,
          );
        }

        const analysesTotal = totalRes.count ?? 0;
        const cacheHits = cacheRes.count ?? 0;
        const hitRatePct =
          analysesTotal > 0 ? Number(((cacheHits / analysesTotal) * 100).toFixed(1)) : null;

        return jsonResponse({
          success: true,
          window_days: days,
          analyses_total: analysesTotal,
          cache_hits: cacheHits,
          hit_rate_pct: hitRatePct,
        });
      },
    },
  },
});