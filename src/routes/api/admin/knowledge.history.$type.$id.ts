import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import { getEntityHistory } from "@/lib/knowledge/queries.server";

export const Route = createFileRoute("/api/admin/knowledge/history/$type/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try { await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }
        if (params.type !== "benchmark" && params.type !== "source" && params.type !== "note") {
          return new Response("Invalid type", { status: 400 });
        }
        try {
          const data = await getEntityHistory(params.type, params.id);
          return Response.json(data);
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "unknown" },
            { status: 500 },
          );
        }
      },
    },
  },
});
