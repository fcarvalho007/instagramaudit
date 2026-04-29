/**
 * POST /api/public/hooks/sync-apify-costs
 *
 * Chamado pelo `pg_cron` diariamente. Protegido por `INTERNAL_API_TOKEN`.
 */

import { createFileRoute } from "@tanstack/react-router";
import { syncApifyCosts } from "@/lib/admin/cost-sync.server";
import { authorizeCronHook } from "@/lib/admin/cron-auth.server";

export const Route = createFileRoute("/api/public/hooks/sync-apify-costs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = authorizeCronHook(request);
        if (denied) return denied;
        const summary = await syncApifyCosts();
        return Response.json(summary, { status: summary.ok ? 200 : 500 });
      },
    },
  },
});
