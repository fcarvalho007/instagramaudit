/**
 * PATCH /api/admin/leads-kanban/$id — update lead commercial fields.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

import type { Json } from "@/integrations/supabase/types";

const VALID_STATUSES = [
  "novo_pedido",
  "em_analise",
  "relatorio_gerado",
  "relatorio_visto",
  "feedback_pedido",
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
          if (body.commercial_status === "arquivado") {
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

        return jsonResponse({ success: true, lead: data });
      },
    },
  },
});