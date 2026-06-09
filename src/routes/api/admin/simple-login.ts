/**
 * POST /api/admin/simple-login — gate do admin.
 *
 * Recebe `{ email, password }`. Valida email contra `ADMIN_ALLOWED_EMAILS`
 * e password contra `ADMIN_LOGIN_PASSWORD` (comparação timing-safe). Em
 * sucesso emite cookie HttpOnly `admin_session` (HMAC sobre SESSION_SECRET,
 * TTL 8h). Sem cookie válido nenhum endpoint `/api/admin/*` responde.
 */

import { createFileRoute } from "@tanstack/react-router";
import { isAdminEmailAllowed } from "@/lib/admin/session";
import { setAdminCookie } from "@/lib/admin/cookie.server";
import { timingSafeEqual } from "node:crypto";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function passwordMatches(provided: string): boolean {
  const expected = process.env.ADMIN_LOGIN_PASSWORD ?? "";
  // Fail-closed se o secret não estiver configurado.
  if (expected.length < 8) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) {
    // Igualar comprimento para manter timing constante.
    const max = Math.max(a.length, b.length, 1);
    const padA = Buffer.alloc(max);
    const padB = Buffer.alloc(max);
    a.copy(padA);
    b.copy(padB);
    timingSafeEqual(padA, padB); // descartado — comprimentos diferentes
    return false;
  }
  return timingSafeEqual(a, b);
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
        const obj =
          payload && typeof payload === "object"
            ? (payload as { email?: unknown; password?: unknown })
            : {};
        const email = String(obj.email ?? "").trim().toLowerCase();
        const password = String(obj.password ?? "");
        if (!email || !password) {
          return json({ ok: false, error: "CREDENTIALS_REQUIRED" }, 400);
        }
        // Validar email e password antes de revelar qual falhou (anti-enumeration).
        const emailOk = isAdminEmailAllowed(email);
        const pwdOk = passwordMatches(password);
        if (!emailOk || !pwdOk) {
          return json({ ok: false, error: "INVALID_CREDENTIALS" }, 403);
        }
        try {
          setAdminCookie(email);
        } catch (err) {
          console.error("[admin/simple-login] cookie write failed", err);
          return json({ ok: false, error: "SESSION_ERROR" }, 500);
        }
        return json({ ok: true });
      },
    },
  },
});