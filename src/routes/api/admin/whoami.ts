/**
 * GET /api/admin/whoami — devolve se o pedido tem sessão admin válida.
 *
 * Lê o cookie `admin_session` (HMAC sobre SESSION_SECRET, TTL 8h). Já não
 * aceita header `X-Admin-Email`: o endpoint deixou de ser um oráculo de
 * enumeração da allowlist.
 */

import { createFileRoute } from "@tanstack/react-router";
import { isAdminEmailAllowed } from "@/lib/admin/session";
import { getAdminEmailFromCookie } from "@/lib/admin/cookie.server";

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
        const email = getAdminEmailFromCookie();
        if (!email) return json({ allowed: false, email: null });
        // Mesmo com cookie assinado revalidamos contra a allowlist em
        // runtime (caso o email tenha sido removido entretanto).
        return json({ allowed: isAdminEmailAllowed(email), email });
      },
    },
  },
});