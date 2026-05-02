import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import { fetchCommentScraperMetrics } from "@/lib/admin/system-queries.server";

export const Route = createFileRoute("/api/admin/sistema/comment-scraper")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }
        const sinceIso = new Date(
          Date.now() - 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
        const metrics = await fetchCommentScraperMetrics(sinceIso);
        return Response.json(metrics);
      },
    },
  },
});