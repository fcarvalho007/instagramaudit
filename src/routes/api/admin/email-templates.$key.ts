import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/session";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  EMAIL_TEMPLATES,
  TEMPLATE_VARIABLES,
  getTemplateByKey,
  type EmailTemplateKey,
} from "@/lib/admin/email-template-registry";
import { getTemplateDefaultParts } from "@/lib/email/templates";
import {
  invalidateOverrideCache,
  loadOverride,
} from "@/lib/email/template-overrides.server";

const VALID_KEYS = new Set(EMAIL_TEMPLATES.map((t) => t.key));

const PutSchema = z.object({
  subject: z.string().max(300).nullable().optional(),
  preheader: z.string().max(300).nullable().optional(),
  headline: z.string().max(300).nullable().optional(),
  body_html: z.string().max(100_000).nullable().optional(),
  body_text: z.string().max(100_000).nullable().optional(),
});

function ensureKey(raw: string): EmailTemplateKey | null {
  return VALID_KEYS.has(raw as EmailTemplateKey)
    ? (raw as EmailTemplateKey)
    : null;
}

export const Route = createFileRoute("/api/admin/email-templates/$key")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try { await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }

        const key = ensureKey(params.key);
        if (!key) return Response.json({ error: "unknown_template" }, { status: 404 });

        const entry = getTemplateByKey(key)!;
        const override = await loadOverride(key);

        return Response.json({
          key,
          title: entry.title,
          category: entry.category,
          wired: entry.wired,
          wiredAt: entry.wiredAt,
          wiredNote: entry.wiredNote ?? null,
          variables: TEMPLATE_VARIABLES[key],
          defaults: getTemplateDefaultParts(key),
          override,
        });
      },

      PUT: async ({ params, request }) => {
        let user;
        try { user = await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }

        const key = ensureKey(params.key);
        if (!key) return Response.json({ error: "unknown_template" }, { status: 404 });

        let body: unknown;
        try { body = await request.json(); }
        catch { return Response.json({ error: "invalid_json" }, { status: 400 }); }

        const parsed = PutSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "invalid_payload", issues: parsed.error.issues },
            { status: 400 },
          );
        }

        const payload = {
          template_key: key,
          subject: parsed.data.subject ?? null,
          preheader: parsed.data.preheader ?? null,
          headline: parsed.data.headline ?? null,
          body_html: parsed.data.body_html ?? null,
          body_text: parsed.data.body_text ?? null,
          updated_by_email: user.email,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabaseAdmin
          .from("email_template_overrides")
          .upsert(payload, { onConflict: "template_key" });

        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }

        invalidateOverrideCache(key);
        return Response.json({ ok: true, updatedAt: payload.updated_at });
      },

      DELETE: async ({ params }) => {
        try { await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }

        const key = ensureKey(params.key);
        if (!key) return Response.json({ error: "unknown_template" }, { status: 404 });

        const { error } = await supabaseAdmin
          .from("email_template_overrides")
          .delete()
          .eq("template_key", key);

        if (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }

        invalidateOverrideCache(key);
        return Response.json({ ok: true });
      },
    },
  },
});