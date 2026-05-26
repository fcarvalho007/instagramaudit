import { createFileRoute } from "@tanstack/react-router";
import { requireAdminSession } from "@/lib/admin/session";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { EMAIL_TEMPLATES } from "@/lib/admin/email-template-registry";

export const Route = createFileRoute("/api/admin/email-templates")({
  server: {
    handlers: {
      GET: async () => {
        try { await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }

        const { data, error } = await supabaseAdmin
          .from("email_template_overrides")
          .select("template_key, updated_at, updated_by_email");

        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }

        const byKey = new Map(
          (data ?? []).map((r) => [r.template_key as string, r]),
        );

        const items = EMAIL_TEMPLATES.map((t) => {
          const ov = byKey.get(t.key);
          return {
            key: t.key,
            title: t.title,
            category: t.category,
            wired: t.wired,
            hasOverride: !!ov,
            updatedAt: ov?.updated_at ?? null,
            updatedByEmail: ov?.updated_by_email ?? null,
          };
        });

        return Response.json({ items });
      },
    },
  },
});