/**
 * GET /api/admin/funnel — agregados do funil de aquisição (últimos 30 dias).
 *
 * Retorna contagens reais a partir de `analysis_events`, `leads`,
 * `report_requests`. Visitantes anónimos ainda não são trackeados.
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

export const Route = createFileRoute("/api/admin/funnel")({
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

        const [analysesRes, leadsRes, requestsRes] = await Promise.all([
          supabaseAdmin
            .from("analysis_events")
            .select("*", { count: "exact", head: true })
            .gte("created_at", since)
            .neq("data_source", "cache"),
          supabaseAdmin
            .from("leads")
            .select("*", { count: "exact", head: true })
            .gte("created_at", since),
          supabaseAdmin
            .from("report_requests")
            .select("lead_id", { count: "exact" })
            .gte("created_at", since),
        ]);

        const analyses = analysesRes.count ?? 0;
        const leads = leadsRes.count ?? 0;
        const requestsTotal = requestsRes.count ?? 0;
        const uniqueCustomers = new Set(
          (requestsRes.data ?? []).map((r) => r.lead_id).filter(Boolean),
        ).size;

        const leadToCustomerPct = leads > 0
          ? Number(((uniqueCustomers / leads) * 100).toFixed(1))
          : null;

        return jsonResponse({
          success: true,
          window_days: 30,
          visitors: null, // sem tracker
          analyses,
          leads,
          customers: uniqueCustomers,
          report_requests_total: requestsTotal,
          lead_to_customer_pct: leadToCustomerPct,
        });
      },
    },
  },
});