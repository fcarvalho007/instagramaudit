/**
 * GET /api/admin/report-requests/pipeline — pipeline real de relatórios.
 *
 * Unidade = análise. Pipeline com 5 fases:
 *   1. Análise gerada (snapshot sem unlock por email)
 *   2. Email submetido (lead criado, ainda sem PDF)
 *   3. PDF gerado (aguarda envio)
 *   4. Email entregue (ciclo completo)
 *   5. Falhado (qualquer fase)
 * Aceita ?period=… (default 30d).
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import { resolvePeriod } from "@/lib/admin/period";
import {
  buildPipelineSummary,
  type PipelineRequestInput,
} from "@/lib/admin/pipeline-phases";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/report-requests/pipeline")({
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

        // Análises na janela.
        const { data: snapshots, error: sErr } = await supabaseAdmin
          .from("analysis_snapshots")
          .select("id, analysis_status, created_at")
          .gte("created_at", sinceISO)
          .limit(5000);
        if (sErr) {
          return jsonResponse(
            { success: false, error_code: "QUERY_FAILED", message: sErr.message },
            500,
          );
        }
        const snaps = snapshots ?? [];
        const snapshotIds = snaps.map((s) => s.id);

        // Report_requests associados a essas análises.
        type Req = PipelineRequestInput & {
          analysis_snapshot_id: string | null;
          created_at: string;
        };
        let requests: Req[] = [];
        if (snapshotIds.length > 0) {
          const { data, error: rErr } = await supabaseAdmin
            .from("report_requests")
            .select(
              "analysis_snapshot_id, request_status, pdf_status, delivery_status, created_at, email_sent_at",
            )
            .in("analysis_snapshot_id", snapshotIds);
          if (rErr) {
            return jsonResponse(
              { success: false, error_code: "QUERY_FAILED", message: rErr.message },
              500,
            );
          }
          requests = (data ?? []) as Req[];
        }
        const reqBySnap = new Map<string, PipelineRequestInput>();
        const reqCreatedAt = new Map<string, string>();
        for (const r of requests) {
          if (!r.analysis_snapshot_id) continue;
          const prevAt = reqCreatedAt.get(r.analysis_snapshot_id);
          if (!prevAt || r.created_at > prevAt) {
            reqCreatedAt.set(r.analysis_snapshot_id, r.created_at);
            reqBySnap.set(r.analysis_snapshot_id, {
              request_status: r.request_status,
              pdf_status: r.pdf_status,
              delivery_status: r.delivery_status,
              email_sent_at: r.email_sent_at,
            });
          }
        }

        const summary = buildPipelineSummary(snaps, reqBySnap);
        const { phases, failures_to_recover, delivered, delivery_avg_seconds, total } =
          summary;
        const successRate = total > 0 ? (delivered / total) * 100 : null;

        // Custo médio na janela (provider_call_logs ÷ análises totais).
        let avgCost: number | null = null;
        if (total > 0) {
          const { data: logs } = await supabaseAdmin
            .from("provider_call_logs")
            .select("estimated_cost_usd, actual_cost_usd")
            .gte("created_at", sinceISO)
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
          phases,
          failures_to_recover,
          window_days: days,
          avg_total_seconds: delivery_avg_seconds,
          success_rate_pct: successRate,
          avg_cost_usd: avgCost,
          total_window: total,
        });
      },
    },
  },
});