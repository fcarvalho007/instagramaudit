/**
 * POST /api/admin/logout — limpa o cookie `admin_session`.
 */

import { createFileRoute } from "@tanstack/react-router";
import { clearAdminCookie } from "@/lib/admin/cookie.server";

export const Route = createFileRoute("/api/admin/logout")({
  server: {
    handlers: {
      POST: async () => {
        try {
          clearAdminCookie();
        } catch {
          /* ignore */
        }
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});