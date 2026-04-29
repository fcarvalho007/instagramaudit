/**
 * POST /api/admin/simple-login — gate simples do admin (modo testes privados).
 *
 * Recebe `{ email }`, valida contra `ADMIN_ALLOWED_EMAILS` (case-insensitive)
 * e devolve 200 `{ ok: true }` ou 403. Sem cookies/sessão server-side: é o
 * cliente que persiste a flag em localStorage e a envia em `X-Admin-Email`
 * nos pedidos seguintes.
 */

import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/api/admin/simple-login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown = null;
        try {
          payload = await request.json();
        } catch {
          return json({ ok: false, error: "INVALID_BODY" }, 400);
        }
        const email =
          payload && typeof payload === "object" && "email" in payload
            ? String((payload as { email: unknown }).email ?? "").trim().toLowerCase()
            : "";
        if (!email) {
          return json({ ok: false, error: "EMAIL_REQUIRED" }, 400);
        }
        if (!isAdminEmailAllowed(email)) {
          return json({ ok: false, error: "NOT_ALLOWED", email }, 403);
        }
        return json({ ok: true, email });
      },
    },
  },
});