import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/session";
import { listNotes, upsertNote } from "@/lib/knowledge/queries.server";

const DATE = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const UpsertSchema = z.object({
  id: z.string().uuid().optional(),
  category: z.enum(["trend", "format", "algorithm", "vertical", "tool"]),
  vertical: z.string().max(100).nullable().optional(),
  title: z.string().min(2).max(200),
  body: z.string().min(2).max(4000),
  source_id: z.string().uuid().nullable().optional(),
  valid_from: DATE.nullable().optional(),
  valid_to: DATE.nullable().optional(),
});

export const Route = createFileRoute("/api/admin/knowledge/notes")({
  server: {
    handlers: {
      GET: async () => {
        try { await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }
        try {
          return Response.json(await listNotes());
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
        const parsed = UpsertSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten() }, { status: 400 });
        }
        try {
          await upsertNote(parsed.data, user.email);
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
