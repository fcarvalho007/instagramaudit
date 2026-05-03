import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/admin/force-refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        let body: { instagram_username?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const username = body.instagram_username?.trim().replace(/^@/, "").toLowerCase();
        if (!username || username.length < 2 || username.length > 60) {
          return Response.json({ error: "Invalid username" }, { status: 400 });
        }

        // Expire all snapshots for this username by setting expires_at to past
        const { data, error } = await supabaseAdmin
          .from("analysis_snapshots")
          .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
          .eq("instagram_username", username)
          .select("id, expires_at");

        if (error) {
          console.error("[force-refresh] DB error:", error.message);
          return Response.json({ error: "Database error" }, { status: 500 });
        }

        console.info(`[force-refresh] Expired ${data?.length ?? 0} snapshot(s) for @${username}`);

        return Response.json({
          success: true,
          expired_count: data?.length ?? 0,
          username,
        });
      },
    },
  },
});