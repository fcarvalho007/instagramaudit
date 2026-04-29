import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import { ackAlert } from "@/lib/admin/system-queries.server";

export const Route = createFileRoute("/api/admin/sistema/alerts/$id/ack")({
  server: {
    handlers: {
      POST: async ({ params }) => {
        try { await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }
        await ackAlert(params.id);
        return Response.json({ ok: true });
      },
    },
  },
});
