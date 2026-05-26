import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin/session";
import {
  EMAIL_TEMPLATES,
  SAMPLE,
  getTemplateByKey,
  type EmailTemplateKey,
} from "@/lib/admin/email-template-registry";
import {
  renderWithOverrideSync,
  type EmailTemplateOverride,
} from "@/lib/email/template-overrides.server";

const VALID_KEYS = new Set(EMAIL_TEMPLATES.map((t) => t.key));

const PreviewSchema = z.object({
  subject: z.string().max(300).nullable().optional(),
  preheader: z.string().max(300).nullable().optional(),
  headline: z.string().max(300).nullable().optional(),
  body_html: z.string().max(100_000).nullable().optional(),
  body_text: z.string().max(100_000).nullable().optional(),
});

export const Route = createFileRoute("/api/admin/email-templates/$key/preview")({
  server: {
    handlers: {
      POST: async ({ params, request }) => {
        try { await requireAdminSession(); }
        catch (res) { if (res instanceof Response) return res; throw res; }

        const key = VALID_KEYS.has(params.key as EmailTemplateKey)
          ? (params.key as EmailTemplateKey)
          : null;
        if (!key) return Response.json({ error: "unknown_template" }, { status: 404 });

        const entry = getTemplateByKey(key)!;

        let body: unknown = {};
        try { body = await request.json(); } catch { body = {}; }
        const parsed = PreviewSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json({ error: "invalid_payload" }, { status: 400 });
        }

        const override: EmailTemplateOverride = {
          subject: parsed.data.subject ?? null,
          preheader: parsed.data.preheader ?? null,
          headline: parsed.data.headline ?? null,
          body_html: parsed.data.body_html ?? null,
          body_text: parsed.data.body_text ?? null,
          updated_at: null,
          updated_by_email: null,
        };

        const rendered = renderWithOverrideSync(
          SAMPLE as unknown as Record<string, string>,
          entry.render,
          override,
        );

        return Response.json({
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        });
      },
    },
  },
});