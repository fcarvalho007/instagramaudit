import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import { getOverview } from "@/lib/knowledge/queries.server";

export const Route = createFileRoute("/api/admin/knowledge/overview")({
  server: {
    handlers: {
      GET: async () => {
        try { await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }
        try {
          return Response.json(await getOverview());
        } catch (err) {
          const msg = err instanceof Error ? err.message : "unknown";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
