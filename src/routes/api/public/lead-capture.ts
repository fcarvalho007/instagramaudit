/**
 * POST /api/public/lead-capture — captura de lead pós-valor (Ronda 4).
 *
 * Um único campo obrigatório: email. Sem nome, sem password, sem
 * qualificação. O visitante já viu a Auditoria Instantânea; este endpoint
 * fecha a conversão e devolve valor imediato:
 *
 *   1. cria/actualiza o lead (idempotente por `email_normalized`);
 *   2. lead novo → emite cookie `lead_session`;
 *      lead existente → NÃO emite cookie (um email não pode dar acesso ao
 *      histórico de outra pessoa); devolve grant de âmbito restrito ao
 *      relatório corrente e envia link de acesso por email;
 *   3. associa o snapshot anónimo ao lead (ponte já existente);
 *   4. arranca o Comment Intelligence com os mesmos guardas do endpoint
 *      `/api/public/unlock-comments` (idempotente, cap mensal, limites).
 *
 * O consentimento de marketing é registado em separado do email
 * operacional e nunca é revogado implicitamente.
 */

import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { setLeadCookie } from "@/lib/leads/lead-cookie.server";
import { signScopedGrant } from "@/lib/leads/scoped-grant.server";
import { claimAnonymousBaselineReport } from "@/lib/credits/lead-reports.server";
import { clientIp, runCommentUnlock } from "@/lib/enrichment/unlock-comments.server";
import { CONVERSION_ENTRY_POINTS, MARKETING_CONSENT_VERSION } from "@/lib/leads/lead-capture";

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

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 24);
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
              instagram_handle: handle,
              marketing_consent: parsed.data.marketing_consent,
              marketing_consent_at: parsed.data.marketing_consent ? consentAt : null,
              gdpr_consent_at: consentAt,
              gdpr_consent_version: MARKETING_CONSENT_VERSION,
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

        // 2. sessão apenas para leads novos (ver cabeçalho).
        if (leadStatus === "created") {
          try {
            setLeadCookie(leadId);
          } catch (err) {
            console.warn("[lead-capture] cookie issue failed", err);
          }
        }

        // 3. ponte snapshot anónimo → lead.
        let claimed = false;
        let cacheKey: string | null = null;
        try {
          const claim = await claimAnonymousBaselineReport({ leadId, handle });
          claimed = claim.claimed;
          cacheKey = claim.cacheKey;
        } catch (err) {
          console.warn("[lead-capture] claim failed", err);
        }

        // 4. Comment Intelligence — a falha de associação não bloqueia a
        // conversão, apenas o desbloqueio.
        let unlock: Record<string, unknown> = { status: "unavailable" };
        if (claimed && cacheKey) {
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
          scoped: leadStatus === "existing",
          claimed,
          cache_key: cacheKey,
          grant: cacheKey ? signScopedGrant(leadId, cacheKey) : null,
          unlock,
          actor_hash: hashIp(ip),
        });
      },
    },
  },
});
