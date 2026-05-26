/**
 * GET /api/admin/leads-funnel — 3 taxas de conversão do funil de receita,
 * janela móvel de 30 dias (default).
 *
 * - reportsToLm: leads com relatório → subscritores do Lead Magnet
 *   (lead.marketing_consent OR product_events com email LM enviado).
 * - lmToCheckout: subscritores LM → leads com checkout iniciado
 *   (lead_payments com pelo menos 1 linha, qualquer status).
 * - checkoutToPaid: leads com checkout iniciado → leads com pagamento
 *   `paid` confirmado.
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

interface FunnelRate {
  rate: number; // 0..1
  numerator: number;
  denominator: number;
}

function rate(n: number, d: number): FunnelRate {
  return {
    rate: d > 0 ? n / d : 0,
    numerator: n,
    denominator: d,
  };
}

export const Route = createFileRoute("/api/admin/leads-funnel")({
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
        const windowDays = Math.max(
          1,
          Math.min(365, Number(url.searchParams.get("days")) || 30),
        );
        const since = new Date(
          Date.now() - windowDays * 24 * 60 * 60 * 1000,
        ).toISOString();

        // 1. Leads criados na janela.
        const { data: leads, error: leadsErr } = await supabaseAdmin
          .from("leads")
          .select("id, marketing_consent, created_at")
          .gte("created_at", since);

        if (leadsErr) {
          console.error("[leads-funnel] leads query failed", leadsErr);
          return jsonResponse(
            { success: false, error: leadsErr.message },
            500,
          );
        }

        const leadIds = (leads ?? []).map((l) => l.id);
        if (leadIds.length === 0) {
          return jsonResponse({
            success: true,
            windowDays,
            reportsToLm: rate(0, 0),
            lmToCheckout: rate(0, 0),
            checkoutToPaid: rate(0, 0),
          });
        }

        // 2. Leads com relatório (denominador A): report_requests dentro da janela.
        const { data: requests } = await supabaseAdmin
          .from("report_requests")
          .select("lead_id")
          .in("lead_id", leadIds);

        const leadsWithReport = new Set(
          (requests ?? []).map((r) => r.lead_id as string).filter(Boolean),
        );

        // 3. Subscritores LM: marketing_consent OU evento LM relevante.
        const lmSubscribers = new Set<string>();
        for (const l of leads ?? []) {
          if (l.marketing_consent) lmSubscribers.add(l.id);
        }
        const { data: lmEvents } = await supabaseAdmin
          .from("product_events")
          .select("lead_id")
          .in("lead_id", leadIds)
          .in("event_type", [
            "beta_welcome_email_sent",
            "report_summary_email_sent",
          ]);
        for (const ev of lmEvents ?? []) {
          if (ev.lead_id) lmSubscribers.add(ev.lead_id as string);
        }

        // 4. Pagamentos por lead.
        const { data: payments } = await supabaseAdmin
          .from("lead_payments")
          .select("lead_id, status")
          .in("lead_id", leadIds);

        const leadsWithCheckout = new Set<string>();
        const leadsPaid = new Set<string>();
        for (const p of payments ?? []) {
          const lid = p.lead_id as string;
          if (!lid) continue;
          leadsWithCheckout.add(lid);
          if (p.status === "paid") leadsPaid.add(lid);
        }

        // 5. Cálculo das 3 taxas.
        // A. Reports → LM (entre quem teve report, quantos são LM subscriber)
        const denomA = leadsWithReport.size;
        let numA = 0;
        for (const id of leadsWithReport) {
          if (lmSubscribers.has(id)) numA++;
        }

        // B. LM → Checkout
        const denomB = lmSubscribers.size;
        let numB = 0;
        for (const id of lmSubscribers) {
          if (leadsWithCheckout.has(id)) numB++;
        }

        // C. Checkout → Pago
        const denomC = leadsWithCheckout.size;
        const numC = leadsPaid.size;

        return jsonResponse({
          success: true,
          windowDays,
          reportsToLm: rate(numA, denomA),
          lmToCheckout: rate(numB, denomB),
          checkoutToPaid: rate(numC, denomC),
        });
      },
    },
  },
});