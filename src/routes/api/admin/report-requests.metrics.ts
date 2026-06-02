/**
 * GET /api/admin/report-requests/metrics — KPIs operacionais de relatórios.
 *
 * Unidade = análise (`analysis_snapshots`). Janela parametrizável via ?period.
 *   - total_analyses, with_unlock, unlock_rate_pct
 *   - delivered, failed, in_progress, success_rate_pct
 *   - avg_delivery_minutes (apenas para análises com email entregue)
 *   - avg_cost_usd (provider_call_logs ÷ análises totais)
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import { resolvePeriod } from "@/lib/admin/period";
import { fetchExpense30d } from "@/lib/admin/system-queries.server";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/report-requests/metrics")({
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

        const { data: snapshots, error: sErr } = await supabaseAdmin
          .from("analysis_snapshots")
          .select("id, created_at")
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
        const totalAnalyses = snaps.length;

        type Req = {
          analysis_snapshot_id: string | null;
          request_status: string;
          pdf_status: string;
          delivery_status: string;
          created_at: string;
          email_sent_at: string | null;
        };
        let reqs: Req[] = [];
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
          reqs = (data ?? []) as Req[];
        }
        const reqBySnap = new Map<string, Req>();
        for (const r of reqs) {
          if (!r.analysis_snapshot_id) continue;
          const e = reqBySnap.get(r.analysis_snapshot_id);
          if (!e || r.created_at > e.created_at) {
            reqBySnap.set(r.analysis_snapshot_id, r);
          }
        }

        const withUnlock = reqBySnap.size;
        let delivered = 0;
        let failed = 0;
        let inProgress = 0;
        let deliverySum = 0;
        let deliveryN = 0;

        for (const s of snaps) {
          const r = reqBySnap.get(s.id);
          if (!r) continue;
          if (r.delivery_status === "sent") {
            delivered += 1;
            if (r.email_sent_at) {
              const ms =
                new Date(r.email_sent_at).getTime() - new Date(s.created_at).getTime();
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

        const unlockRate =
          totalAnalyses > 0 ? (withUnlock / totalAnalyses) * 100 : null;
        const successRate =
          totalAnalyses > 0 ? (delivered / totalAnalyses) * 100 : null;
        const avgDeliveryMinutes =
          deliveryN > 0 ? deliverySum / deliveryN / 60000 : null;

        // Custos: fonte canónica `provider_call_logs` filtrada por
        // source_context (production = public_analysis + enrich_comments).
        // Lab/I&D e refreshes não devem contaminar o KPI "custo médio".
        // Reutiliza fetchExpense30d para garantir o mesmo cálculo das outras
        // secções (Visão Geral / Receita).
        const expense = await fetchExpense30d(sinceISO);
        const totalCostUsd = Number(expense.production_cost_30d ?? 0);
        const apifyCostUsd = Number(expense.apify_total ?? 0);
        const labCostUsd = Number(expense.lab_cost_30d ?? 0);
        // Denominador alinhado com /admin/visao-geral (cost_per_unlocked_report):
        // só análises com chamada paga (fresh) entram. Cache não custa nada.
        const freshAnalyses = Number(expense.fresh_reports ?? 0);
        const avgCostUsd =
          freshAnalyses > 0 ? totalCostUsd / freshAnalyses : null;

        return jsonResponse({
          success: true,
          window_days: days,
          total_analyses: totalAnalyses,
          with_unlock: withUnlock,
          unlock_rate_pct: unlockRate,
          delivered,
          failed,
          in_progress: inProgress,
          success_rate_pct: successRate,
          avg_delivery_minutes: avgDeliveryMinutes,
          avg_cost_usd: avgCostUsd,
          total_cost_usd: totalCostUsd,
          apify_cost_usd: apifyCostUsd,
          lab_cost_usd: labCostUsd,
        });
      },
    },
  },
});