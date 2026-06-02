/**
 * GET /api/admin/leads-funnel — funil de conversão (LM-first), janela 30d.
 *
 * Modelo actual: o Lead Magnet é a inscrição inicial. Todo lead na DB
 * passou por LM, logo "Reports → LM" deixou de ter sinal. O funil é:
 *
 *   Inscrição LM  →  Checkout iniciado  →  Pago
 *
 * - lmSignups       : leads criados na janela (absoluto).
 * - lmToCheckout    : inscrição LM → ≥1 linha em lead_payments (qq status).
 * - checkoutToPaid  : leads com checkout iniciado → ≥1 lead_payments.paid.
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

        // 1. Inscrições LM = leads criados na janela.
        const { data: leads, error: leadsErr } = await supabaseAdmin
          .from("leads")
          .select("id")
          .gte("created_at", since);

        if (leadsErr) {
          console.error("[leads-funnel] leads query failed", leadsErr);
          return jsonResponse(
            { success: false, error: leadsErr.message },
            500,
          );
        }

        const leadIds = (leads ?? []).map((l) => l.id);
        const lmCount = leadIds.length;

        if (lmCount === 0) {
          return jsonResponse({
            success: true,
            windowDays,
            lmSignups: lmCount,
            lmToCheckout: rate(0, 0),
            checkoutToPaid: rate(0, 0),
          });
        }

        // 2. Pagamentos por lead (todos os statuses).
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

        const checkoutCount = leadsWithCheckout.size;
        const paidCount = leadsPaid.size;

        return jsonResponse({
          success: true,
          windowDays,
          lmSignups: lmCount,
          lmToCheckout: rate(checkoutCount, lmCount),
          checkoutToPaid: rate(paidCount, checkoutCount),
        });
      },
    },
  },
});