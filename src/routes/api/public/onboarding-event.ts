/**
 * POST /api/public/onboarding-event
 *
 * Endpoint público de tracking do funil de onboarding. Insere uma linha
 * em `product_events` via service role. Não usa cookie de lead; apenas
 * regista step + handle + marketing flag.
 *
 * Defesa básica: rate limit in-memory por IP-hash (best-effort no worker)
 * e validação de enum estrita.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "crypto";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Schema = z.object({
  event_type: z.enum([
    "onboarding_step_view",
    "onboarding_step_complete",
    "onboarding_abandon",
    "onboarding_success",
  ]),
  step: z.number().int().min(0).max(3),
  handle: z.string().trim().max(60).optional(),
  marketing_consent: z.boolean().optional(),
});

// Per-isolate, best-effort rate limit: 120 events/min por IP hash.
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

export const Route = createFileRoute("/api/public/onboarding-event")({
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
        if (rateLimited(ipHash)) {
          return new Response(null, { status: 204 });
        }
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return new Response(null, { status: 204 });
        }
        const parsed = Schema.safeParse(raw);
        if (!parsed.success) {
          return new Response(null, { status: 204 });
        }
        try {
          await supabaseAdmin.from("product_events").insert({
            event_type: parsed.data.event_type,
            handle: parsed.data.handle ?? null,
            actor_hash: ipHash,
            metadata: {
              step: parsed.data.step,
              marketing_consent: parsed.data.marketing_consent ?? null,
            },
          });
        } catch (err) {
          console.warn("[onboarding-event] insert failed", err);
        }
        return new Response(null, { status: 204 });
      },
    },
  },
});