import { createFileRoute } from "@tanstack/react-router";
import { syncOpenAiCosts } from "@/lib/admin/cost-sync.server";
import { authorizeCronHook } from "@/lib/admin/cron-auth.server";

export const Route = createFileRoute("/api/public/hooks/sync-openai-costs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = authorizeCronHook(request);
        if (denied) return denied;
        const summary = await syncOpenAiCosts();
        return Response.json(summary, { status: summary.ok ? 200 : 500 });
      },
    },
  },
});
