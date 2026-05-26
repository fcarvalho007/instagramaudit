/**
 * GET /api/admin/report-requests/pipeline — estado atual do pipeline.
 *
 * Conta quantos pedidos estão em cada fase (pending / processing / pdf / email)
 * e devolve agregados de SLA. Janela: últimos 30 dias para os agregados; as
 * fases mostram o estado "vivo" (não filtrado por janela).
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

export const Route = createFileRoute("/api/admin/report-requests/pipeline")({
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
            "id, request_status, pdf_status, delivery_status, analysis_snapshot_id, created_at, email_sent_at",
          )
          .order("created_at", { ascending: false })
          .limit(2000);

        if (error) {
          return jsonResponse(
            { success: false, error_code: "QUERY_FAILED", message: error.message },
            500,
          );
        }

        const rows = data ?? [];

        // Fase actual de cada pedido (lifo):
        //   pedido = nenhuma análise ainda
        //   analise = análise feita mas pdf ainda não
        //   pdf = pdf gerado mas email não
        //   email = email entregue
        let phPedido = 0,
          phAnalise = 0,
          phPdf = 0,
          phEmail = 0,
          failures = 0;
        for (const r of rows) {
          if (r.delivery_status === "sent") phEmail += 1;
          else if (
            r.request_status === "failed" ||
            r.pdf_status === "failed" ||
            r.delivery_status === "failed"
          )
            failures += 1;
          else if (r.pdf_status === "generated") phPdf += 1;
          else if (r.analysis_snapshot_id) phAnalise += 1;
          else phPedido += 1;
        }

        // Agregados últimos 30d
        const window = rows.filter((r) => r.created_at >= since);
        const total = window.length;
        let delivered = 0;
        let deliverySum = 0;
        let deliveryN = 0;
        for (const r of window) {
          if (r.delivery_status === "sent") {
            delivered += 1;
            if (r.email_sent_at) {
              const ms = new Date(r.email_sent_at).getTime() - new Date(r.created_at).getTime();
              if (Number.isFinite(ms) && ms >= 0) {
                deliverySum += ms;
                deliveryN += 1;
              }
            }
          }
        }

        const avgTotalSec = deliveryN > 0 ? deliverySum / deliveryN / 1000 : null;
        const successRate = total > 0 ? (delivered / total) * 100 : null;

        // Custo médio na janela
        let avgCost: number | null = null;
        if (total > 0) {
          const { data: logs } = await supabaseAdmin
            .from("provider_call_logs")
            .select("estimated_cost_usd, actual_cost_usd")
            .gte("created_at", since)
            .limit(5000);
          const totalCost = (logs ?? []).reduce(
            (acc, l) =>
              acc +
              Number(
                (l as { actual_cost_usd?: number | null }).actual_cost_usd ??
                  (l as { estimated_cost_usd?: number | null }).estimated_cost_usd ??
                  0,
              ),
            0,
          );
          avgCost = totalCost / total;
        }

        return jsonResponse({
          success: true,
          phases: {
            pedido: phPedido,
            analise: phAnalise,
            pdf: phPdf,
            email: phEmail,
          },
          failures_to_recover: failures,
          window_days: 30,
          avg_total_seconds: avgTotalSec,
          success_rate_pct: successRate,
          avg_cost_usd: avgCost,
          total_window: total,
        });
      },
    },
  },
});