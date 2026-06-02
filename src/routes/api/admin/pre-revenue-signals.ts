/**
 * GET /api/admin/pre-revenue-signals
 *
 * Agrega sinais reais de pré-receita enquanto o checkout não está ligado:
 *  • lead_payments   → pagamentos confirmados + total cobrado
 *  • beta_feedback   → intenção de compra (purchase_intent) + preferência de preço
 *  • pricing_interest → sinais de WTP recolhidos na página /preços
 *
 * Read-only, admin-gated. Sem dependências de cache; barato (counts + selects pequenos).
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface PricingInterestRow {
  id: string;
  created_at: string;
  pricing_option: string;
  would_pay: string;
  price_fairness: string | null;
  comment: string | null;
}

export interface PreRevenueSignals {
  payments: {
    paid_count_all_time: number;
    paid_count_30d: number;
    paid_amount_eur_all_time: number;
    paid_amount_eur_30d: number;
  };
  beta_feedback: {
    total: number;
    by_intent: Record<string, number>;
    positive_intent_pct: number | null;
    by_pricing_preference: Record<string, number>;
  };
  pricing_interest: {
    total_all_time: number;
    total_30d: number;
    would_pay_yes_30d: number;
    by_option_30d: Record<string, number>;
    recent: PricingInterestRow[];
  };
}

export const Route = createFileRoute("/api/admin/pre-revenue-signals")({
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

        const [
          paidAllRes,
          paid30Res,
          betaRes,
          interestAllRes,
          interest30Res,
          interestRecentRes,
        ] = await Promise.all([
          supabaseAdmin
            .from("lead_payments")
            .select("amount_cents")
            .eq("status", "paid"),
          supabaseAdmin
            .from("lead_payments")
            .select("amount_cents")
            .eq("status", "paid")
            .gte("paid_at", since30),
          supabaseAdmin
            .from("beta_feedback")
            .select("purchase_intent, pricing_preference"),
          supabaseAdmin
            .from("pricing_interest")
            .select("id", { count: "exact", head: true }),
          supabaseAdmin
            .from("pricing_interest")
            .select("pricing_option, would_pay")
            .gte("created_at", since30),
          supabaseAdmin
            .from("pricing_interest")
            .select("id, created_at, pricing_option, would_pay, price_fairness, comment")
            .order("created_at", { ascending: false })
            .limit(8),
        ]);

        const paidAll = paidAllRes.data ?? [];
        const paid30 = paid30Res.data ?? [];
        const beta = betaRes.data ?? [];
        const interest30 = interest30Res.data ?? [];

        const intentMap: Record<string, number> = {};
        const prefMap: Record<string, number> = {};
        for (const row of beta) {
          const intent = String(row.purchase_intent ?? "").trim() || "—";
          intentMap[intent] = (intentMap[intent] ?? 0) + 1;
          const pref = String(row.pricing_preference ?? "").trim();
          if (pref) prefMap[pref] = (prefMap[pref] ?? 0) + 1;
        }
        const positiveIntent =
          (intentMap["sim"] ?? 0) +
          (intentMap["talvez"] ?? 0) +
          (intentMap["yes"] ?? 0) +
          (intentMap["maybe"] ?? 0);
        const positivePct = beta.length > 0 ? (positiveIntent / beta.length) * 100 : null;

        const optionMap: Record<string, number> = {};
        let wouldPayYes30 = 0;
        for (const row of interest30) {
          const opt = String(row.pricing_option ?? "—");
          optionMap[opt] = (optionMap[opt] ?? 0) + 1;
          const wp = String(row.would_pay ?? "").toLowerCase();
          if (wp === "sim" || wp === "yes") wouldPayYes30 += 1;
        }

        const body: PreRevenueSignals = {
          payments: {
            paid_count_all_time: paidAll.length,
            paid_count_30d: paid30.length,
            paid_amount_eur_all_time:
              paidAll.reduce((s, r) => s + Number(r.amount_cents ?? 0), 0) / 100,
            paid_amount_eur_30d:
              paid30.reduce((s, r) => s + Number(r.amount_cents ?? 0), 0) / 100,
          },
          beta_feedback: {
            total: beta.length,
            by_intent: intentMap,
            positive_intent_pct: positivePct,
            by_pricing_preference: prefMap,
          },
          pricing_interest: {
            total_all_time: interestAllRes.count ?? 0,
            total_30d: interest30.length,
            would_pay_yes_30d: wouldPayYes30,
            by_option_30d: optionMap,
            recent: (interestRecentRes.data ?? []) as PricingInterestRow[],
          },
        };

        return Response.json(body, {
          headers: { "cache-control": "private, max-age=30" },
        });
      },
    },
  },
});