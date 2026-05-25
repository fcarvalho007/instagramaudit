/**
 * DELETE /api/admin/leads-bulk — eliminação em massa de leads.
 *
 * Protegido por `requireAdminSession`. Apaga em ordem segura todas as
 * tabelas que referenciam `leads.id` antes de remover os próprios leads.
 * Não há transação cross-table no PostgREST — abortamos no primeiro erro
 * e devolvemos o estado parcial para diagnóstico.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

const BodySchema = z.object({
  ids: z
    .array(z.string().uuid())
    .min(1, "Pelo menos um id")
    .max(200, "Máximo 200 ids por pedido")
    .transform((arr) => Array.from(new Set(arr))),
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/leads-bulk")({
  server: {
    handlers: {
      DELETE: async ({ request }) => {
        let admin;
        try {
          admin = await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        let parsed;
        try {
          const raw = await request.json();
          parsed = BodySchema.safeParse(raw);
        } catch {
          return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
        }
        if (!parsed.success) {
          return jsonResponse(
            {
              success: false,
              error: parsed.error.issues[0]?.message ?? "Pedido inválido",
            },
            400,
          );
        }
        const ids = parsed.data.ids;

        const details = {
          profiles_unlinked: 0,
          feedback: 0,
          snapshots: 0,
          requests: 0,
          events: 0,
          leads: 0,
        };

        // 1) desligar profiles
        {
          const { error, count } = await supabaseAdmin
            .from("profiles")
            .update({ lead_id: null }, { count: "exact" })
            .in("lead_id", ids);
          if (error) {
            console.error("[leads-bulk] profiles unlink failed", error);
            return jsonResponse(
              { success: false, error: "Falha ao desligar perfis", details },
              500,
            );
          }
          details.profiles_unlinked = count ?? 0;
        }

        // 2) beta_feedback
        {
          const { error, count } = await supabaseAdmin
            .from("beta_feedback")
            .delete({ count: "exact" })
            .in("lead_id", ids);
          if (error) {
            console.error("[leads-bulk] beta_feedback delete failed", error);
            return jsonResponse(
              { success: false, error: "Falha ao apagar feedback", details },
              500,
            );
          }
          details.feedback = count ?? 0;
        }

        // 3) report_snapshots
        {
          const { error, count } = await supabaseAdmin
            .from("report_snapshots")
            .delete({ count: "exact" })
            .in("lead_id", ids);
          if (error) {
            console.error("[leads-bulk] report_snapshots delete failed", error);
            return jsonResponse(
              { success: false, error: "Falha ao apagar snapshots", details },
              500,
            );
          }
          details.snapshots = count ?? 0;
        }

        // 4) report_requests
        {
          const { error, count } = await supabaseAdmin
            .from("report_requests")
            .delete({ count: "exact" })
            .in("lead_id", ids);
          if (error) {
            console.error("[leads-bulk] report_requests delete failed", error);
            return jsonResponse(
              { success: false, error: "Falha ao apagar pedidos", details },
              500,
            );
          }
          details.requests = count ?? 0;
        }

        // 5) product_events
        {
          const { error, count } = await supabaseAdmin
            .from("product_events")
            .delete({ count: "exact" })
            .in("lead_id", ids);
          if (error) {
            console.error("[leads-bulk] product_events delete failed", error);
            return jsonResponse(
              { success: false, error: "Falha ao apagar eventos", details },
              500,
            );
          }
          details.events = count ?? 0;
        }

        // 6) leads
        {
          const { error, count } = await supabaseAdmin
            .from("leads")
            .delete({ count: "exact" })
            .in("id", ids);
          if (error) {
            console.error("[leads-bulk] leads delete failed", error);
            return jsonResponse(
              { success: false, error: "Falha ao apagar contactos", details },
              500,
            );
          }
          details.leads = count ?? 0;
        }

        // auditoria (best-effort)
        try {
          await supabaseAdmin.from("product_events").insert([
            {
              event_type: "leads_bulk_deleted",
              metadata: {
                count: details.leads,
                requested: ids.length,
                ids_sample: ids.slice(0, 10),
                actor_email: admin?.email ?? null,
                details,
              },
            },
          ]);
        } catch (err) {
          console.error("[leads-bulk] audit insert failed", err);
        }

        return jsonResponse({
          success: true,
          deleted: details.leads,
          details,
        });
      },
    },
  },
});