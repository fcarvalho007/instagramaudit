/**
 * GET /api/admin/analysis-window-counts?period=…
 *
 * Conta análises por janela (baseline / 30d / 90d / outras) na janela
 * temporal pedida. Usa `analysis_events.analysis_window` quando presente
 * e cai para o sufixo `:w=…` do cache_key para eventos legacy.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import { resolvePeriod } from "@/lib/admin/period";
import { deriveWindow } from "@/lib/admin/analysis-window";

const MAX_ROWS = 5000;

export interface AnalysisWindowCounts {
  success: true;
  window_days: number;
  total: number;
  baseline: number;
  "30d": number;
  "90d": number;
  other: number;
  truncated: boolean;
  generated_at: string;
}

export const Route = createFileRoute("/api/admin/analysis-window-counts")({
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

        const { data, error } = await supabaseAdmin
          .from("analysis_events")
          .select("analysis_window, cache_key")
          .gte("created_at", sinceISO)
          .order("created_at", { ascending: false })
          .limit(MAX_ROWS);

        if (error) {
          return new Response(
            JSON.stringify({
              success: false,
              error_code: "QUERY_FAILED",
              message: error.message,
            }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const counts = { baseline: 0, "30d": 0, "90d": 0, other: 0 };
        for (const row of data ?? []) {
          const w = deriveWindow(row.analysis_window, row.cache_key);
          counts[w] += 1;
        }

        const total = (data?.length ?? 0);

        const body: AnalysisWindowCounts = {
          success: true,
          window_days: days,
          total,
          baseline: counts.baseline,
          "30d": counts["30d"],
          "90d": counts["90d"],
          other: counts.other,
          truncated: total >= MAX_ROWS,
          generated_at: new Date().toISOString(),
        };

        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});