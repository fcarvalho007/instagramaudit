/**
 * POST /api/admin/logout — clears the admin session cookie.
 */

import { createFileRoute } from "@tanstack/react-router";
import { clearAdminSession } from "@/lib/admin/session";

export const Route = createFileRoute("/api/admin/logout")({
  server: {
    handlers: {
      POST: async () => {
        await clearAdminSession();
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
