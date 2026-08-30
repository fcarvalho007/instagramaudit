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
import { computeKpis, type MarginStatus } from "@/lib/admin/overview-formulas";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface OverviewKpis {
  leads_30d: number;
  leads_7d: number;
  analyses_30d: number;
  fresh_analyses_30d: number;
  reports_unlocked_30d: number;
  cost_total_30d: number;
  cost_public_30d: number;
  /** Production provider cost 30d (public_analysis + enrich_comments). */
  production_cost_30d: number;
  /** Admin Apify Lab / I&D cost 30d. Mirrored from `apify_lab_runs`. */
  lab_cost_30d: number;
  /** Admin refresh / backfill / unknown legacy cost 30d. */
  other_cost_30d: number;
  revenue_total_30d: number;
  revenue_active: boolean;
  cost_per_lead: number | null;
  cost_per_analysis: number | null;
  cost_per_unlocked_report: number | null;
  revenue_per_lead: number | null;
  margin_per_lead: number | null;
  margin_status: MarginStatus;
  avg_cost_per_report: number | null;
  reliability_pct: number;
  checkout_enabled: boolean;
  providers: {
    apify: { total: number; cap: number };
    openai: { total: number; cap: number };
    dataforseo: { total: number; balance: number | null };
    /** Provider primário — contabilizado em créditos, não em USD. */
    scrapecreators: {
      credits_30d: number;
      calls_30d: number;
      balance_credits: number | null;
      balance_age_seconds: number | null;
      equivalent_cost_usd_30d: number;
      actual_cash_cost_usd_30d: number;
      promotional: boolean;
    };
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

        const [
          leads30Res,
          leads7Res,
          analyses30Res,
          freshAnalyses30Res,
          reportsUnlocked30Res,
          paid30Res,
          paidAllTimeRes,
          expense,
          caps,
          scrapecreators,
        ] = await Promise.all([
          supabaseAdmin
            .from("leads")
            .select("id", { count: "exact", head: true })
            .gte("created_at", since30),
          supabaseAdmin
            .from("leads")
            .select("id", { count: "exact", head: true })
            .gte("created_at", since7),
          supabaseAdmin
            .from("analysis_events")
            .select("id", { count: "exact", head: true })
            .eq("outcome", "success")
            .in("data_source", ["fresh", "cache"])
            .gte("created_at", since30),
          supabaseAdmin
            .from("analysis_events")
            .select("id", { count: "exact", head: true })
            .eq("outcome", "success")
            .eq("data_source", "fresh")
            .gte("created_at", since30),
          supabaseAdmin
            .from("lead_reports")
            .select("id", { count: "exact", head: true })
            .gte("created_at", since30),
          supabaseAdmin
            .from("lead_payments")
            .select("amount_cents", { count: "exact" })
            .eq("status", "paid")
            .gte("paid_at", since30),
          supabaseAdmin
            .from("lead_payments")
            .select("id", { count: "exact", head: true })
            .eq("status", "paid"),
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
        const analyses_30d = analyses30Res.count ?? 0;
        const fresh_analyses_30d = freshAnalyses30Res.count ?? 0;
        const reports_unlocked_30d = reportsUnlocked30Res.count ?? 0;

        const cost_total_30d = Number(expense.total ?? 0);
        // "Custo público" = chamadas ligadas a fresh events (exclui lab e órfãs).
        // Melhor proxy honesto disponível sem mexer no pipeline de custos.
        const cost_public_30d = Number(expense.fresh_linked_total_usd ?? 0);
        // Production/Lab/Other split (source_context — fonte canónica para
        // cost-per-lead e margem).
        const production_cost_30d = Number(expense.production_cost_30d ?? 0);
        const lab_cost_30d = Number(expense.lab_cost_30d ?? 0);
        const other_cost_30d = Number(expense.other_cost_30d ?? 0);

        // Receita: soma dos `lead_payments` pagos nos últimos 30 dias.
        // `revenue_active` flip-flap pela existência de QUALQUER pagamento
        // (all-time) — se nunca houve checkout real, KPI de margem fica null.
        const paidRows = (paid30Res.data ?? []) as Array<{ amount_cents: number | null }>;
        const revenue_30d = paidRows.reduce(
          (s, r) => s + (Number(r.amount_cents ?? 0) / 100),
          0,
        );
        const revenue_active = (paidAllTimeRes.count ?? 0) > 0;

        const formulas = computeKpis({
          leads_30d,
          analyses_30d,
          fresh_analyses_30d,
          reports_unlocked_30d,
          cost_total_30d,
          cost_public_30d,
          production_cost_30d,
          lab_cost_30d,
          other_cost_30d,
          fresh_avg_cost_per_report: expense.fresh_avg_cost_per_report ?? null,
          revenue_30d,
          revenue_active,
        });

        const round = (n: number | null) =>
          n === null ? null : Number(n.toFixed(4));

        const body: OverviewKpis = {
          leads_30d,
          leads_7d,
          analyses_30d,
          fresh_analyses_30d,
          reports_unlocked_30d,
          cost_total_30d: Number(cost_total_30d.toFixed(4)),
          cost_public_30d: Number(cost_public_30d.toFixed(4)),
          production_cost_30d: Number(production_cost_30d.toFixed(4)),
          lab_cost_30d: Number(lab_cost_30d.toFixed(4)),
          other_cost_30d: Number(other_cost_30d.toFixed(4)),
          revenue_total_30d: Number(revenue_30d.toFixed(2)),
          revenue_active,
          cost_per_lead: round(formulas.cost_per_lead),
          cost_per_analysis: round(formulas.cost_per_analysis),
          cost_per_unlocked_report: round(formulas.cost_per_unlocked_report),
          revenue_per_lead: round(formulas.revenue_per_lead),
          margin_per_lead: round(formulas.margin_per_lead),
          margin_status: formulas.margin_status,
          avg_cost_per_report: expense.fresh_avg_cost_per_report ?? null,
          reliability_pct: Number(expense.provider_linkage_rate_pct ?? 0),
          checkout_enabled: revenue_active,
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