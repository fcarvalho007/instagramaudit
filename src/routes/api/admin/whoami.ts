/**
 * GET /api/admin/whoami — devolve se a sessão atual é um admin autorizado.
 *
 * Lê o JWT do header Authorization (definido pelo client após login com
 * Google). Não lança 401/403 — devolve sempre 200 com `{ allowed, email }`
 * para que o gate do client possa decidir entre mostrar o cockpit ou o
 * ecrã "Acesso restrito" + signOut().
 */

import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isAdminEmailAllowed } from "@/lib/admin/session";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export const Route = createFileRoute("/api/admin/whoami")({
  server: {
    handlers: {
      GET: async () => {
        const auth =
          getRequestHeader("authorization") ?? getRequestHeader("Authorization");
        const token = auth ? /^Bearer\s+(.+)$/i.exec(auth.trim())?.[1] ?? null : null;

        if (!token) {
          return json({ allowed: false, email: null });
        }

        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !data?.user) {
          return json({ allowed: false, email: null });
        }

        const email = data.user.email ?? null;
        return json({ allowed: isAdminEmailAllowed(email), email });
      },
    },
  },
});