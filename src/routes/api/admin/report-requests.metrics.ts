/**
 * GET /api/admin/report-requests/metrics — KPIs operacionais de relatórios (30d).
 *
 * Calcula a partir de `report_requests` agregados reais:
 *   - delivered_30d, total_30d, in_progress_30d, failed_30d
 *   - success_rate_pct, avg_delivery_minutes
 *   - avg_cost_usd (via provider_call_logs por handle, best-effort)
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

export const Route = createFileRoute("/api/admin/report-requests/metrics")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const { data, error } = await supabaseAdmin
          .from("report_requests")
          .select(
            "id, instagram_username, request_status, pdf_status, delivery_status, created_at, email_sent_at",
          )
          .gte("created_at", since)
          .limit(2000);

        if (error) {
          return jsonResponse(
            { success: false, error_code: "QUERY_FAILED", message: error.message },
            500,
          );
        }

        const rows = data ?? [];
        const total = rows.length;
        let delivered = 0;
        let failed = 0;
        let inProgress = 0;
        let deliverySum = 0;
        let deliveryN = 0;

        for (const r of rows) {
          if (r.delivery_status === "sent") {
            delivered += 1;
            if (r.email_sent_at) {
              const ms = new Date(r.email_sent_at).getTime() - new Date(r.created_at).getTime();
              if (Number.isFinite(ms) && ms >= 0) {
                deliverySum += ms;
                deliveryN += 1;
              }
            }
          } else if (
            r.request_status === "failed" ||
            r.pdf_status === "failed" ||
            r.delivery_status === "failed"
          ) {
            failed += 1;
          } else {
            inProgress += 1;
          }
        }

        const successRate = total > 0 ? (delivered / total) * 100 : null;
        const avgDeliveryMinutes = deliveryN > 0 ? deliverySum / deliveryN / 60000 : null;

        // Custo médio: soma de provider_call_logs (apify+openai) na janela / nº pedidos
        let avgCostUsd: number | null = null;
        if (total > 0) {
          const { data: logs } = await supabaseAdmin
            .from("provider_call_logs")
            .select("estimated_cost_usd, actual_cost_usd")
            .gte("created_at", since)
            .limit(5000);
          const totalCost = (logs ?? []).reduce(
            (acc, l) =>
              acc + Number((l as { actual_cost_usd?: number | null }).actual_cost_usd ?? (l as { estimated_cost_usd?: number | null }).estimated_cost_usd ?? 0),
            0,
          );
          avgCostUsd = totalCost / total;
        }

        return jsonResponse({
          success: true,
          window_days: 30,
          total_30d: total,
          delivered_30d: delivered,
          failed_30d: failed,
          in_progress_30d: inProgress,
          success_rate_pct: successRate,
          avg_delivery_minutes: avgDeliveryMinutes,
          avg_cost_usd: avgCostUsd,
        });
      },
    },
  },
});