/**
 * POST /api/admin/auth — validates the admin token and sets the session cookie.
 * POST /api/admin/auth (DELETE) is handled separately via /api/admin/logout.
 *
 * Token comparison uses constant-time logic where possible.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { setAdminSession } from "@/lib/admin/session";

const Schema = z.object({
  token: z.string().min(1).max(512),
});

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export const Route = createFileRoute("/api/admin/auth")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.INTERNAL_API_TOKEN;
        if (!expected) {
          return jsonResponse(
            {
              success: false,
              error_code: "NOT_CONFIGURED",
              message: "Acesso administrativo indisponível.",
            },
            500,
          );
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return jsonResponse(
            { success: false, error_code: "INVALID_PAYLOAD", message: "Pedido inválido." },
            400,
          );
        }

        const parsed = Schema.safeParse(raw);
        if (!parsed.success) {
          return jsonResponse(
            { success: false, error_code: "INVALID_PAYLOAD", message: "Token em falta." },
            400,
          );
        }

        if (!constantTimeEqual(parsed.data.token, expected)) {
          return jsonResponse(
            { success: false, error_code: "INVALID_TOKEN", message: "Token inválido." },
            401,
          );
        }

        await setAdminSession();
        return jsonResponse({ success: true }, 200);
      },
    },
  },
});
