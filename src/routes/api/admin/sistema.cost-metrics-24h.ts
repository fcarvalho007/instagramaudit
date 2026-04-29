import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import { fetchCostMetrics24h } from "@/lib/admin/system-queries.server";

export const Route = createFileRoute("/api/admin/sistema/cost-metrics-24h")({
  server: {
    handlers: {
      GET: async () => {
        try { await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }
        return Response.json(await fetchCostMetrics24h());
      },
    },
  },
});
