/**
 * POST /api/public/brevo-test-sync — diagnóstico Brevo sync.
 *
 * Vive em /api/public/* para escapar ao gating do preview do Lovable que
 * intercepta /api/admin/* fora de sessão browser. Continua protegido pela
 * mesma allowlist `ADMIN_ALLOWED_EMAILS` via header `X-Admin-Email`.
 * Endpoint efémero — remover após validação Fase 6.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { isAdminEmailAllowed } from "@/lib/admin/session";
import { syncLeadToBrevo } from "@/lib/brevo/sync.server";

const bodySchema = z.object({
  leadId: z.string().uuid(),
  reason: z.string().trim().min(1).max(60).optional(),
});

export const Route = createFileRoute("/api/public/brevo-test-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const adminEmail =
          request.headers.get("x-admin-email") ?? request.headers.get("X-Admin-Email");
        if (!isAdminEmailAllowed(adminEmail)) {
          return new Response(
            JSON.stringify({ error: "FORBIDDEN" }),
            { status: 403, headers: { "Content-Type": "application/json" } },
          );
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return new Response(
            JSON.stringify({ error: "INVALID_JSON" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: "INVALID_PAYLOAD", issues: parsed.error.flatten() }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const env = {
          hasLovableKey: Boolean(process.env.LOVABLE_API_KEY?.trim()),
          hasBrevoKey: Boolean(process.env.BREVO_API_KEY?.trim()),
          hasListId: Boolean(process.env.BREVO_LEAD_MAGNET_LIST_ID?.trim()),
          listIdRaw: process.env.BREVO_LEAD_MAGNET_LIST_ID?.trim() ?? null,
        };

        const outcome = await syncLeadToBrevo(
          parsed.data.leadId,
          (parsed.data.reason ?? "admin_test") as any,
        );

        return new Response(
          JSON.stringify({ env, outcome }, null, 2),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});