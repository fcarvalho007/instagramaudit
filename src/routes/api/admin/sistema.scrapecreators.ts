import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import { fetchScrapeCreatorsCosts } from "@/lib/admin/scrapecreators-costs.server";

export const Route = createFileRoute("/api/admin/sistema/scrapecreators")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }
        return Response.json(await fetchScrapeCreatorsCosts());
      },
    },
  },
});
