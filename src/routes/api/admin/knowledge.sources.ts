import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/session";
import { createSource, listSources } from "@/lib/knowledge/queries.server";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const CreateSchema = z.object({
  name: z.string().min(2).max(200),
  type: z.enum(["study", "dataset", "api", "internal"]).nullable().optional(),
  url: z.string().url().max(500).nullable().optional(),
  published_at: DATE.nullable().optional(),
  sample_size: z.number().int().min(1).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const Route = createFileRoute("/api/admin/knowledge/sources")({
  server: {
    handlers: {
      GET: async () => {
        try { await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }
        try {
          return Response.json(await listSources());
        } catch (err) {
          return Response.json(
            { error: err instanceof Error ? err.message : "unknown" },
            { status: 500 },
          );
        }
      },
      POST: async ({ request }) => {
        let user;
        try { user = await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }
        let body: unknown;
        try { body = await request.json(); }
        catch { return new Response("Invalid JSON", { status: 400 }); }
        const parsed = CreateSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten() }, { status: 400 });
        }
        try {
          const row = await createSource(parsed.data, user.email);
          return Response.json(row);
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
