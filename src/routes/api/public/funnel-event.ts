/**
 * POST /api/public/funnel-event
 *
 * Ronda 3 — tracking do funil anónimo (landing → auditoria instantânea).
 * Insere uma linha em `product_events` via service role. Não usa cookie de
 * lead nem guarda IP em bruto (apenas hash SHA-256 truncado).
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const ANONYMOUS_FUNNEL_EVENTS = [
  "landing_view",
  "instagram_handle_submitted",
  "anonymous_analysis_started",
  "anonymous_analysis_success",
  "anonymous_analysis_failed",
  "instant_audit_viewed",
  "instant_audit_scroll_25",
  "instant_audit_scroll_50",
  "instant_audit_scroll_75",
  "instant_audit_scroll_100",
  "save_audit_cta_viewed",
  "save_audit_cta_clicked",
  "level2_cta_viewed",
  "level2_cta_clicked",
  // Ronda 4 — captura pós-valor e desbloqueio do Nível 2
  "lead_cta_viewed",
  "lead_cta_clicked",
  "lead_capture_opened",
  "email_field_started",
  "email_submitted",
  "email_validation_failed",
  "lead_created",
  "existing_lead_detected",
  "snapshot_claimed",
  "level2_unlock_started",
  "relationship_question_viewed",
  "relationship_answered",
  "relationship_skipped",
  "comment_intelligence_started",
  "comment_intelligence_success",
  "comment_intelligence_failed",
] as const;

export type AnonymousFunnelEvent = (typeof ANONYMOUS_FUNNEL_EVENTS)[number];

const Schema = z.object({
  event_type: z.enum(ANONYMOUS_FUNNEL_EVENTS),
  handle: z.string().trim().max(60).optional(),
  snapshot_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Per-isolate, best-effort rate limit: 120 eventos/min por IP hash.
const RATE_LIMIT = 120;
const WINDOW_MS = 60_000;
const buckets = new Map<string, { count: number; resetAt: number }>();

function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex").slice(0, 24);
}

function getIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function rateLimited(ipHash: string): boolean {
  const now = Date.now();
  const b = buckets.get(ipHash);
  if (!b || b.resetAt < now) {
    buckets.set(ipHash, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  b.count += 1;
  return b.count > RATE_LIMIT;
}

export const Route = createFileRoute("/api/public/funnel-event")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
      POST: async ({ request }) => {
        const ipHash = hashIp(getIp(request));
        if (rateLimited(ipHash)) return new Response(null, { status: 204 });

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return new Response(null, { status: 204 });
        }
        const parsed = Schema.safeParse(raw);
        if (!parsed.success) return new Response(null, { status: 204 });

        try {
          await supabaseAdmin.from("product_events").insert({
            event_type: parsed.data.event_type,
            handle: parsed.data.handle ?? null,
            snapshot_id: parsed.data.snapshot_id ?? null,
            actor_hash: ipHash,
            metadata: (parsed.data.metadata ?? {}) as never,
          } as never);
        } catch (err) {
          console.warn("[funnel-event] insert failed", err);
        }
        return new Response(null, { status: 204 });
      },
    },
  },
});
