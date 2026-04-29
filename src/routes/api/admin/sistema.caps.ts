import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/session";
import { fetchCostCaps, setCostCap } from "@/lib/admin/system-queries.server";

const PatchSchema = z.object({
  apify: z.number().positive().max(10000).optional(),
  openai: z.number().positive().max(10000).optional(),
  dataforseo: z.number().positive().max(10000).optional(),
});

export const Route = createFileRoute("/api/admin/sistema/caps")({
  server: {
    handlers: {
      GET: async () => {
        try { await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }
        return Response.json(await fetchCostCaps());
      },
      PATCH: async ({ request }) => {
        let user;
        try { user = await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }
        let body: unknown;
        try { body = await request.json(); }
        catch { return new Response("Invalid JSON", { status: 400 }); }
        const parsed = PatchSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: parsed.error.flatten() }, { status: 400 });
        }
        for (const [provider, value] of Object.entries(parsed.data)) {
          if (typeof value === "number") {
            await setCostCap(provider as "apify" | "openai" | "dataforseo", value, user.email);
          }
        }
        return Response.json(await fetchCostCaps());
      },
    },
  },
});
