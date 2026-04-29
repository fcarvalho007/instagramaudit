import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/session";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PatchSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export const Route = createFileRoute("/api/admin/knowledge/suggestions/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
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
        const { error } = await supabaseAdmin
          .from("knowledge_suggestions")
          .update({
            status: parsed.data.status,
            reviewed_by_email: user.email,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", params.id);
        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
