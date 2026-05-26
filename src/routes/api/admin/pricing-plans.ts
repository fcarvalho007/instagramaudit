/**
 * /api/admin/pricing-plans
 *
 * GET  → lista os planos (admin-only, mas o conteúdo é idêntico ao público).
 * PUT  → atualiza um plano (label, price_cents, unit_label, active).
 *
 * Gate via `requireAdminSession` (header X-Admin-Email + allowlist).
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

const UpdateSchema = z.object({
  key: z.enum(["single_report", "pack_5_reports"]),
  label: z.string().trim().min(1).max(120),
  price_cents: z.number().int().min(0).max(1_000_000),
  unit_label: z.string().trim().max(120).nullable().optional(),
  active: z.boolean().optional(),
});

export const Route = createFileRoute("/api/admin/pricing-plans")({
  server: {
    handlers: {
      GET: async () => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        const { data, error } = await supabaseAdmin
          .from("pricing_plans")
          .select(
            "key, label, price_cents, currency, unit_label, sort_order, active, updated_at, updated_by_email",
          )
          .order("sort_order", { ascending: true });

        if (error) {
          return json({ ok: false, error: error.message }, 500);
        }
        return json({ ok: true, plans: data });
      },

      PUT: async ({ request }) => {
        let admin;
        try {
          admin = await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ ok: false, code: "INVALID_PAYLOAD" }, 400);
        }

        const parsed = UpdateSchema.safeParse(raw);
        if (!parsed.success) {
          return json({ ok: false, code: "INVALID_PAYLOAD", issues: parsed.error.issues }, 400);
        }

        const patch: {
          label: string;
          price_cents: number;
          unit_label: string | null;
          updated_by_email: string;
          active?: boolean;
        } = {
          label: parsed.data.label,
          price_cents: parsed.data.price_cents,
          unit_label: parsed.data.unit_label ?? null,
          updated_by_email: admin.email,
        };
        if (typeof parsed.data.active === "boolean") {
          patch.active = parsed.data.active;
        }

        const { data, error } = await supabaseAdmin
          .from("pricing_plans")
          .update(patch)
          .eq("key", parsed.data.key)
          .select(
            "key, label, price_cents, currency, unit_label, sort_order, active, updated_at, updated_by_email",
          )
          .single();

        if (error) {
          return json({ ok: false, error: error.message }, 500);
        }
        return json({ ok: true, plan: data });
      },
    },
  },
});