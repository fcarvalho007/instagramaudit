import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import { archiveNote } from "@/lib/knowledge/queries.server";

export const Route = createFileRoute("/api/admin/knowledge/notes/$id")({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        let user;
        try { user = await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }
        try {
          await archiveNote(params.id, user.email);
          return Response.json({ ok: true });
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "unknown" },
            { status: 500 },
          );
        }
      },
    },
  },
});
