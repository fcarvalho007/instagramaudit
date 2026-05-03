import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import { fetchEnrichmentJobSummary } from "@/lib/admin/system-queries.server";

export const Route = createFileRoute("/api/admin/sistema/enrichment-jobs")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }
        const summary = await fetchEnrichmentJobSummary();
        return Response.json(summary);
      },
    },
  },
});