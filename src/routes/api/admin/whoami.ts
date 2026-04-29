/**
 * GET /api/admin/whoami — devolve se o email atual é um admin autorizado.
 *
 * Lê `X-Admin-Email` (gate simples) e valida contra a allowlist. Devolve
 * sempre 200 com `{ allowed, email }` — o gate do cliente decide o resto.
 */

import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeader } from "@tanstack/react-start/server";
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
        const raw =
          getRequestHeader("x-admin-email") ??
          getRequestHeader("X-Admin-Email");
        const email = raw ? raw.trim().toLowerCase() : null;
        if (!email) return json({ allowed: false, email: null });
        return json({ allowed: isAdminEmailAllowed(email), email });
      },
    },
  },
});