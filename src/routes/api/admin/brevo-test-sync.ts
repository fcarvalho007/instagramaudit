/**
 * POST /api/admin/brevo-test-sync — diagnóstico efémero do sync Brevo.
 *
 * Chama `syncLeadToBrevo` directamente e devolve o `BrevoSyncOutcome`
 * sem mascarar para isolar a causa real (LOVABLE_API_KEY_MISSING,
 * BREVO_API_KEY_MISSING, BREVO_4xx, BREVO_TIMEOUT, etc.) sem depender
 * dos logs do worker. Inclui auditoria do ambiente (booleanos).
 *
 * Protegido por `requireAdminSession`. A remover após validação Fase 6.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { requireAdminSession } from "@/lib/admin/session";
import { syncLeadToBrevo } from "@/lib/brevo/sync.server";

const bodySchema = z.object({
  leadId: z.string().uuid(),
  reason: z.string().trim().min(1).max(60).optional(),
});

export const Route = createFileRoute("/api/admin/brevo-test-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
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