/**
 * POST /api/public/report-relationship — qualificação progressiva (Ronda 4).
 *
 * Guarda a relação declarada ao nível lead ↔ relatório
 * (`lead_reports.profile_relationship`, `relationship_source = user_declared`).
 * Nunca se infere propriedade a partir do perfil analisado, e as métricas da
 * conta analisada nunca passam a ser métricas da empresa do lead.
 *
 * Identificação: cookie `lead_session` (lead novo) ou grant de âmbito
 * restrito devolvido por `/api/public/lead-capture` (lead existente).
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { readLeadIdFromRequest } from "@/lib/leads/lead-cookie.server";
import { verifyScopedGrant } from "@/lib/leads/scoped-grant.server";
import { readCaptureLeadIdFromRequest } from "@/lib/leads/report-capture-session.server";
import { setReportRelationship } from "@/lib/credits/lead-reports.server";
import {
  PROFILE_RELATIONSHIPS,
  RELATIONSHIP_TO_QUALIFICATION,
} from "@/lib/leads/profile-relationship";

const BodySchema = z.object({
  relationship: z.enum(PROFILE_RELATIONSHIPS),
  cache_key: z.string().min(8).max(256),
  grant: z.string().min(10).max(512).optional(),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/report-relationship")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "INVALID_BODY" }, 400);
        }
        const parsed = BodySchema.safeParse(raw);
        if (!parsed.success) return json({ error: "INVALID_BODY" }, 400);

        const cacheKey = parsed.data.cache_key;
        const leadId =
          readLeadIdFromRequest(request) ??
          readCaptureLeadIdFromRequest(request, cacheKey) ??
          verifyScopedGrant(parsed.data.grant ?? null, cacheKey);
        if (!leadId) return json({ error: "NO_LEAD" }, 401);

        await setReportRelationship({
          leadId,
          cacheKey,
          profileRelationship: parsed.data.relationship,
        });

        // Qualificação derivada para CRM — só preenche se ainda estiver vazia.
        // `instagram_handle` só é escrito quando a pessoa declara que a conta
        // é dela; nunca a partir do perfil que se limitou a analisar.
        try {
          const { data: lead } = await supabaseAdmin
            .from("leads")
            .select("id, qualification, instagram_handle")
            .eq("id", leadId)
            .maybeSingle();
          const patch: { qualification?: string; instagram_handle?: string } = {};
          if (lead && !lead.qualification) {
            patch.qualification = RELATIONSHIP_TO_QUALIFICATION[parsed.data.relationship];
          }
          if (lead && !lead.instagram_handle && parsed.data.relationship === "owner") {
            const { data: report } = await supabaseAdmin
              .from("lead_reports")
              .select("handle")
              .eq("lead_id", leadId)
              .eq("cache_key", cacheKey)
              .maybeSingle();
            if (report?.handle) patch.instagram_handle = report.handle;
          }
          if (Object.keys(patch).length > 0) {
            await supabaseAdmin.from("leads").update(patch).eq("id", leadId);
          }
        } catch (err) {
          console.warn("[report-relationship] qualification skipped", err);
        }

        return json({ ok: true });
      },
    },
  },
});
