import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import { fetchRuntimeChecks } from "@/lib/admin/system-queries.server";

export const Route = createFileRoute("/api/admin/sistema/runtime-checks")({
  server: {
    handlers: {
      GET: async () => {
        try { await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }
        return Response.json(fetchRuntimeChecks());
      },
    },
  },
});
