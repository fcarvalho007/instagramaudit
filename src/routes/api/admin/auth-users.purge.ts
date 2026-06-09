/**
 * POST /api/admin/auth-users/purge
 *
 * Apaga um único `auth.users` ÓRFÃO (sem lead activo correspondente).
 * Usado pelo painel de diagnóstico do admin para limpar restos do
 * legacy /signup ou OAuth abandonado, sem ter de invocar o bulk-purge.
 *
 * Body: { email: string }
 * Bloqueia se existir um lead activo (`archived_at IS NULL`) com esse
 * email_normalized — nesse caso o admin deve usar o bulk purge para
 * apagar lead + auth em conjunto.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

const Body = z.object({ email: z.string().trim().email().max(255) });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/auth-users/purge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let admin;
        try {
          admin = await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        let parsed;
        try {
          parsed = Body.safeParse(await request.json());
        } catch {
          return json({ success: false, error: "Invalid JSON" }, 400);
        }
        if (!parsed.success) {
          return json({ success: false, error: "Email inválido" }, 400);
        }
        const email = parsed.data.email.toLowerCase();

        // Guard: lead activo com este email → bloquear.
        const { data: activeLead, error: leadErr } = await supabaseAdmin
          .from("leads")
          .select("id")
          .eq("email_normalized", email)
          .is("archived_at", null)
          .limit(1)
          .maybeSingle();
        if (leadErr) {
          console.error("[auth-users/purge] lead lookup failed", leadErr);
          return json({ success: false, error: "Falha ao verificar lead" }, 500);
        }
        if (activeLead) {
          return json(
            {
              success: false,
              error_code: "ACTIVE_LEAD_EXISTS",
              error: "Existe um lead activo com este email. Use bulk purge.",
            },
            409,
          );
        }

        // Lookup auth user.
        const perPage = 200;
        let userId: string | null = null;
        for (let page = 1; page <= 50; page += 1) {
          const { data, error } = await supabaseAdmin.auth.admin.listUsers({
            page,
            perPage,
          });
          if (error) {
            console.error("[auth-users/purge] listUsers failed", error);
            return json({ success: false, error: "Falha ao listar users" }, 500);
          }
          const users = data?.users ?? [];
          const found = users.find((u) => (u.email ?? "").toLowerCase() === email);
          if (found) {
            userId = found.id;
            break;
          }
          if (users.length < perPage) break;
        }
        if (!userId) {
          return json(
            { success: false, error_code: "NOT_FOUND", error: "Auth user não existe" },
            404,
          );
        }

        const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (delErr) {
          console.error("[auth-users/purge] deleteUser failed", delErr);
          return json({ success: false, error: delErr.message }, 500);
        }

        try {
          await supabaseAdmin.from("product_events").insert([
            {
              event_type: "orphan_auth_user_purged",
              metadata: { email, actor_email: admin?.email ?? null },
            },
          ]);
        } catch (err) {
          console.error("[auth-users/purge] audit insert failed", err);
        }

        return json({ success: true, email });
      },
    },
  },
});