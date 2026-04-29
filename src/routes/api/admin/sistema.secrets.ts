import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import { listSecretPresence } from "@/lib/admin/system-queries.server";

export const Route = createFileRoute("/api/admin/sistema/secrets")({
  server: {
    handlers: {
      GET: async () => {
        try { await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }
        return Response.json(listSecretPresence());
      },
    },
  },
});
