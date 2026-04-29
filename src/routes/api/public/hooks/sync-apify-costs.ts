/**
 * POST /api/public/hooks/sync-apify-costs
 *
 * Chamado pelo `pg_cron` diariamente. Protegido por `INTERNAL_API_TOKEN`.
 */

import { createFileRoute } from "@tanstack/react-router";
import { syncApifyCosts } from "@/lib/admin/cost-sync.server";

export const Route = createFileRoute("/api/public/hooks/sync-apify-costs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.INTERNAL_API_TOKEN;
        const provided = request.headers.get("x-internal-token");
        if (!expected || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const summary = await syncApifyCosts();
        return Response.json(summary, { status: summary.ok ? 200 : 500 });
      },
    },
  },
});
