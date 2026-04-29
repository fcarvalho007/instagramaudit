import { createFileRoute } from "@tanstack/react-router";
import { syncOpenAiCosts } from "@/lib/admin/cost-sync.server";

export const Route = createFileRoute("/api/public/hooks/sync-openai-costs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.INTERNAL_API_TOKEN;
        const provided = request.headers.get("x-internal-token");
        if (!expected || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }
        const summary = await syncOpenAiCosts();
        return Response.json(summary, { status: summary.ok ? 200 : 500 });
      },
    },
  },
});
