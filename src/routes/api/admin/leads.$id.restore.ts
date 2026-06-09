/**
 * POST /api/admin/leads/$id/restore
 *
 * Reverte um archive: `archived_at = null`. Idempotente — se já estiver
 * activo devolve `success: true` com `restored: 0`.
 */
import { createFileRoute } from "@tanstack/react-router";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/leads/$id/restore")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        let admin;
        try {
          admin = await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const id = params.id;
        if (!id) return json({ success: false, error: "id em falta" }, 400);

        const { error, count } = await supabaseAdmin
          .from("leads")
          .update({ archived_at: null }, { count: "exact" })
          .eq("id", id)
          .not("archived_at", "is", null);
        if (error) {
          console.error("[leads/restore] failed", error);
          return json({ success: false, error: "Falha ao restaurar" }, 500);
        }

        try {
          await supabaseAdmin.from("product_events").insert([
            {
              event_type: "lead_restored",
              lead_id: id,
              metadata: { actor_email: admin?.email ?? null },
            },
          ]);
        } catch (err) {
          console.error("[leads/restore] audit insert failed", err);
        }

        return json({ success: true, restored: count ?? 0 });
      },
    },
  },
});