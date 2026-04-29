import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import { exportDataset } from "@/lib/knowledge/queries.server";

export const Route = createFileRoute("/api/admin/knowledge/export")({
  server: {
    handlers: {
      GET: async () => {
        try { await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }
        try {
          const data = await exportDataset();
          const filename = `instabench-knowledge-${new Date().toISOString().slice(0, 10)}.json`;
          return new Response(JSON.stringify(data, null, 2), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Content-Disposition": `attachment; filename="${filename}"`,
            },
          });
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
