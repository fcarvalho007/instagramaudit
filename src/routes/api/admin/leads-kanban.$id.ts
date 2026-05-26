/**
 * PATCH /api/admin/leads-kanban/$id — update lead commercial fields.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import { syncCustomerToBrevo } from "@/lib/brevo/customer-sync.server";

import type { Json } from "@/integrations/supabase/types";

const VALID_STATUSES = [
  // Novos estados do funil de receita
  "lead_magnet",
  "checkout_iniciado",
  "pago_report",
  "pago_pack5",
  "expirado",
  // Estados legados (mantidos para retro-compatibilidade)
  "novo_pedido",
  "em_analise",
  "relatorio_gerado",
  "link_enviado",
  "relatorio_visto",
  "feedback_pedido",
  "feedback_recebido",
  "interessado",
  "potencial_cliente",
  "convertido",
  "arquivado",
] as const;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/leads-kanban/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
        }

        const updates: Record<string, unknown> = {};

        // Read previous status BEFORE update so we can detect a real
        // transition into "convertido" and avoid re-syncing on no-op PATCHes.
        let previousStatus: string | null = null;
        try {
          const { data: prev } = await supabaseAdmin
            .from("leads")
            .select("commercial_status")
            .eq("id", params.id)
            .maybeSingle();
          previousStatus = (prev?.commercial_status as string | null) ?? null;
        } catch {
          previousStatus = null;
        }

        if (typeof body.commercial_status === "string") {
          if (
            !VALID_STATUSES.includes(
              body.commercial_status as (typeof VALID_STATUSES)[number]
            )
          ) {
            return jsonResponse(
              { success: false, error: "Invalid status" },
              400
            );
          }
          updates.commercial_status = body.commercial_status;
          if (
            body.commercial_status === "arquivado" ||
            body.commercial_status === "expirado"
          ) {
            updates.archived_at = new Date().toISOString();
          }
        }

        if (typeof body.internal_notes === "string") {
          updates.internal_notes = body.internal_notes;
        }

        if (body.mark_contacted === true) {
          updates.contacted_at = new Date().toISOString();
        }

        if (Object.keys(updates).length === 0) {
          return jsonResponse(
            { success: false, error: "No valid fields to update" },
            400
          );
        }

        const updatePayload = {
          ...updates,
          updated_at: new Date().toISOString(),
        } as {
          commercial_status?: string;
          internal_notes?: string;
          contacted_at?: string;
          archived_at?: string;
          updated_at: string;
        };

        const { data, error } = await supabaseAdmin
          .from("leads")
          .update(updatePayload)
          .eq("id", params.id)
          .select()
          .maybeSingle();

        if (error) {
          console.error("[leads-kanban] update failed", error);
          return jsonResponse({ success: false, error: error.message }, 500);
        }

        if (!data) {
          return jsonResponse(
            { success: false, error: "Lead not found" },
            404
          );
        }

        // Side-effect: ao marcar manualmente como pago_report / pago_pack5
        // cria um registo em `lead_payments` com provider='manual' para que
        // o histórico financeiro seja consistente desde o dia 1.
        if (
          updates.commercial_status === "pago_report" ||
          updates.commercial_status === "pago_pack5"
        ) {
          const isPack = updates.commercial_status === "pago_pack5";
          const product = isPack ? "pack_5" : "report_single";
          const amount = isPack ? 2800 : 700;
          try {
            // Não duplica se já existir um pagamento manual confirmado para
            // este produto neste lead.
            const { data: existing } = await supabaseAdmin
              .from("lead_payments")
              .select("id")
              .eq("lead_id", params.id)
              .eq("product", product)
              .eq("status", "paid")
              .eq("provider", "manual")
              .maybeSingle();
            if (!existing) {
              await supabaseAdmin.from("lead_payments").insert([{
                lead_id: params.id,
                product,
                amount_cents: amount,
                currency: "EUR",
                status: "paid",
                provider: "manual",
                paid_at: new Date().toISOString(),
              }]);
            }
          } catch (err) {
            console.error("[leads-kanban] manual payment insert failed", err);
            // non-blocking
          }
        }

        // Fire tracking event
        try {
          await supabaseAdmin.from("product_events").insert([{
            event_type: "lead_status_changed",
            lead_id: params.id,
            handle: null,
            metadata: {
              changes: Object.keys(updates).filter((k) => k !== "updated_at"),
              new_status: (updates.commercial_status as string | undefined) ?? null,
            } as { [key: string]: Json | undefined },
          }]);
        } catch {
          // non-critical
        }

        // Fire-and-forget Brevo customer sync on real transition → convertido.
        // Failure here MUST NOT reverse the lead update.
        if (
          updates.commercial_status === "convertido" &&
          previousStatus !== "convertido"
        ) {
          void syncCustomerToBrevo(params.id, "admin_conversion").catch((err) => {
            console.error("[leads-kanban] brevo customer sync failed:", err);
          });
        }

        return jsonResponse({ success: true, lead: data });
      },
    },
  },
});