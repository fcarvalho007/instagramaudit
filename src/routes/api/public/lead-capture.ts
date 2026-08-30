/**
 * POST /api/public/lead-capture — captura de lead pós-valor (Ronda 4).
 *
 * Um único campo obrigatório: email. Sem nome, sem password, sem
 * qualificação. O visitante já viu a Auditoria Instantânea; este endpoint
 * fecha a conversão e devolve valor imediato:
 *
 *   1. cria/actualiza o lead (idempotente por `email_normalized`);
 *   2. emite `report_capture_session` — cookie assinado de âmbito restrito
 *      ao par (lead, cache_key) e válido 24 h. Nunca `lead_session`: um
 *      email não verificado não pode dar acesso ao histórico de ninguém.
 *      Leads já existentes recebem também um link de acesso por email,
 *      cuja verificação é que promove a sessão completa;
 *   3. associa o snapshot anónimo ao lead (ponte já existente);
 *   4. arranca o Comment Intelligence com os mesmos guardas do endpoint
 *      `/api/public/unlock-comments` (idempotente, cap mensal, limites).
 *
 * O consentimento de marketing é registado em separado do email
 * operacional e nunca é revogado implicitamente.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { setCaptureSessionCookie } from "@/lib/leads/report-capture-session.server";
import { signScopedGrant } from "@/lib/leads/scoped-grant.server";
import { claimAnonymousBaselineReport } from "@/lib/credits/lead-reports.server";
import { clientIp, runCommentUnlock } from "@/lib/enrichment/unlock-comments.server";
import {
  CONVERSION_ENTRY_POINTS,
  OPERATIONAL_CONSENT_VERSION,
} from "@/lib/leads/lead-capture";

const BodySchema = z.object({
  email: z.string().trim().min(5).max(255).email(),
  handle: z.string().trim().min(1).max(60),
  marketing_consent: z.boolean().optional().default(false),
  entry_point: z.enum(CONVERSION_ENTRY_POINTS).optional().default("save_audit"),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// Limite best-effort por isolate: 10 capturas por IP/hora.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_IP = 10;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length >= MAX_PER_IP) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return false;
}

export const Route = createFileRoute("/api/public/lead-capture")({
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
        if (!parsed.success) return json({ error: "INVALID_EMAIL" }, 400);

        const ip = clientIp(request);
        if (rateLimited(ip)) return json({ error: "RATE_LIMITED" }, 429);

        const email = parsed.data.email.trim();
        const emailNormalized = email.toLowerCase();
        const handle = parsed.data.handle.trim().replace(/^@/, "").toLowerCase();
        const consentAt = new Date().toISOString();

        // 1. lead existente?
        const { data: existing } = await supabaseAdmin
          .from("leads")
          .select("id, marketing_consent")
          .eq("email_normalized", emailNormalized)
          .maybeSingle();

        let leadId: string;
        let leadStatus: "created" | "existing";

        if (existing?.id) {
          leadId = existing.id;
          leadStatus = "existing";
          // Opt-in nunca é revogado implicitamente; só se activa.
          if (parsed.data.marketing_consent && !existing.marketing_consent) {
            await supabaseAdmin
              .from("leads")
              .update({
                marketing_consent: true,
                marketing_consent_at: consentAt,
              })
              .eq("id", leadId);
          }
        } else {
          const fallbackName = emailNormalized.split("@")[0] ?? "lead";
          const { data: created, error: insertError } = await supabaseAdmin
            .from("leads")
            .insert({
              email,
              email_normalized: emailNormalized,
              name: fallbackName,
              source: "post_value_capture",
              // `instagram_handle` fica vazio: o perfil analisado ainda não
              // é declaradamente do lead. Só é escrito se a pessoa responder
              // "é a minha conta" (ver /api/public/report-relationship).
              marketing_consent: parsed.data.marketing_consent,
              marketing_consent_at: parsed.data.marketing_consent ? consentAt : null,
              // Consentimento operacional (necessário para guardar/entregar
              // a auditoria). O opt-in de marketing acima é independente e
              // tem o seu próprio timestamp.
              gdpr_consent_at: consentAt,
              gdpr_consent_version: OPERATIONAL_CONSENT_VERSION,
            })
            .select("id")
            .single();
          if (insertError || !created?.id) {
            console.warn("[lead-capture] lead insert failed", insertError?.message);
            return json({ error: "LEAD_CREATE_FAILED" }, 500);
          }
          leadId = created.id;
          leadStatus = "created";
        }

        // 2. ponte snapshot anónimo → lead (idempotente).
        let claimed = false;
        let associated = false;
        let cacheKey: string | null = null;
        try {
          const claim = await claimAnonymousBaselineReport({ leadId, handle });
          claimed = claim.created;
          associated = claim.associated;
          cacheKey = claim.cacheKey;
        } catch (err) {
          console.warn("[lead-capture] claim failed", err);
        }

        // 3. acesso scoped ao relatório corrente — nunca sessão global.
        if (associated && cacheKey) {
          try {
            setCaptureSessionCookie(leadId, cacheKey);
          } catch (err) {
            console.warn("[lead-capture] capture cookie failed", err);
          }
        }

        // 4. Comment Intelligence — a falha de associação não bloqueia a
        // conversão, apenas o desbloqueio. Corre também em submissões
        // repetidas: `runCommentUnlock` é idempotente.
        let unlock: Record<string, unknown> = {
          status: associated ? "unavailable" : "snapshot_missing",
        };
        if (associated && cacheKey) {
          const outcome = await runCommentUnlock({
            leadId,
            cacheKey,
            origin: new URL(request.url).origin,
            ip,
          });
          unlock = outcome.ok
            ? outcome.status === "degraded"
              ? { status: "degraded", reason: outcome.reason }
              : { status: outcome.status }
            : { status: "error", error: outcome.error };
        }

        // 5. link de acesso para leads existentes (sem cookie emitido).
        if (leadStatus === "existing") {
          try {
            const { sendReportAccessEmail } = await import(
              "@/lib/email/send-report-access.server"
            );
            await sendReportAccessEmail({
              leadId,
              toEmail: email,
              instagramHandle: handle,
            });
          } catch (err) {
            console.info("[lead-capture] access email skipped", err);
          }
        }

        return json({
          ok: true,
          lead_status: leadStatus,
          scoped: true,
          claimed,
          associated,
          cache_key: cacheKey,
          grant: cacheKey ? signScopedGrant(leadId, cacheKey) : null,
          unlock,
        });
      },
    },
  },
});
