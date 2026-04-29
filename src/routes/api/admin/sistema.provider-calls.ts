import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import { fetchRecentProviderCalls } from "@/lib/admin/system-queries.server";

export const Route = createFileRoute("/api/admin/sistema/provider-calls")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try { await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }
        const url = new URL(request.url);
        const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 20));
        return Response.json(await fetchRecentProviderCalls(limit));
      },
    },
  },
});
