/**
 * GET /api/admin/overview-kpis — KPIs do topo da Visão Geral.
 *
 * Devolve as 4 perguntas da manhã num único call:
 *   • novos inscritos (leads 30d + delta 7d)
 *   • custo total 30d
 *   • receita total 30d (placeholder = 0 enquanto checkout não está ligado)
 *   • margem por lead (receita/lead − custo/lead)
 *
 * Read-only, admin-gated. Reutiliza `fetchExpense30d()` (mesma janela de
 * `provider_call_logs` que o resto do admin).
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import { fetchExpense30d } from "@/lib/admin/system-queries.server";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface OverviewKpis {
  leads_30d: number;
  leads_7d: number;
  cost_total_30d: number;
  revenue_total_30d: number;
  cost_per_lead: number | null;
  revenue_per_lead: number | null;
  margin_per_lead: number | null;
  avg_cost_per_report: number | null;
  reliability_pct: number;
  checkout_enabled: boolean;
  providers: {
    apify: { total: number; cap: number };
    openai: { total: number; cap: number };
    dataforseo: { total: number; balance: number | null };
  };
}

export const Route = createFileRoute("/api/admin/overview-kpis")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const since30 = new Date(Date.now() - 30 * DAY_MS).toISOString();
        const since7 = new Date(Date.now() - 7 * DAY_MS).toISOString();

        const [leads30Res, leads7Res, expense, caps] = await Promise.all([
          supabaseAdmin
            .from("leads")
            .select("id", { count: "exact", head: true })
            .gte("created_at", since30),
          supabaseAdmin
            .from("leads")
            .select("id", { count: "exact", head: true })
            .gte("created_at", since7),
          fetchExpense30d(),
          // Reads cost_cap_* from app_config (default 29/25/50).
          (async () => {
            const { data } = await supabaseAdmin
              .from("app_config")
              .select("key, value")
              .like("key", "cost_cap_%");
            const map = new Map((data ?? []).map((r) => [String(r.key), String(r.value)]));
            return {
              apify: Number(map.get("cost_cap_apify_usd") ?? 29),
              openai: Number(map.get("cost_cap_openai_usd") ?? 25),
              dataforseo: Number(map.get("cost_cap_dataforseo_usd") ?? 50),
            };
          })(),
        ]);

        const leads_30d = leads30Res.count ?? 0;
        const leads_7d = leads7Res.count ?? 0;
        const cost_total_30d = Number(expense.total ?? 0);
        // TODO confirm formula: receita fixa a 0 até EuPago/Stripe ligarem.
        const revenue_total_30d = 0;

        // TODO confirm formula: denominador = leads (não análises).
        const cost_per_lead = leads_30d > 0 ? cost_total_30d / leads_30d : null;
        const revenue_per_lead = leads_30d > 0 ? revenue_total_30d / leads_30d : null;
        const margin_per_lead =
          cost_per_lead !== null && revenue_per_lead !== null
            ? revenue_per_lead - cost_per_lead
            : null;

        const body: OverviewKpis = {
          leads_30d,
          leads_7d,
          cost_total_30d: Number(cost_total_30d.toFixed(4)),
          revenue_total_30d,
          cost_per_lead: cost_per_lead !== null ? Number(cost_per_lead.toFixed(4)) : null,
          revenue_per_lead,
          margin_per_lead:
            margin_per_lead !== null ? Number(margin_per_lead.toFixed(4)) : null,
          avg_cost_per_report: expense.fresh_avg_cost_per_report ?? null,
          reliability_pct: Number(expense.provider_linkage_rate_pct ?? 0),
          checkout_enabled: false,
          providers: {
            apify: { total: Number(expense.apify_total ?? 0), cap: caps.apify },
            openai: { total: Number(expense.openai_total ?? 0), cap: caps.openai },
            dataforseo: {
              total: Number(expense.dataforseo_total ?? 0),
              balance: expense.dataforseo_balance ?? null,
            },
          },
        };

        return Response.json(body);
      },
    },
  },
});