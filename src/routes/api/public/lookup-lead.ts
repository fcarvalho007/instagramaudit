/**
 * Public lead lookup endpoint for the unlock modal.
 *
 * POST /api/public/lookup-lead   { email }
 *   → 200 { exists: boolean, has_qualification: boolean }
 *
 * Used by the unlock modal to skip the 3 qualification questions when a
 * returning lead has already answered them. Response is intentionally
 * minimal — no name, no handle, no IDs, no timestamps — to limit any
 * email-enumeration value.
 *
 * Security:
 * - Constant-shape JSON in every branch (success, not-found, invalid).
 * - Tiny in-memory rate-limit per IP-hash (5 req / 60s) — best-effort,
 *   resets per server instance, never blocks the actual unlock submit.
 * - No auth (public endpoint by design).
 */

import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const RequestSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(255),
  })
  .strict();

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const buckets = new Map<string, number[]>();

function hashIp(req: Request): string {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 16);
}

function rateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) ?? []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS,
  );
  if (arr.length >= RATE_LIMIT_MAX) {
    buckets.set(key, arr);
    return true;
  }
  arr.push(now);
  buckets.set(key, arr);
  // Opportunistic cleanup so the map doesn't grow without bound.
  if (buckets.size > 1000) {
    for (const [k, v] of buckets) {
      const fresh = v.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
      if (fresh.length === 0) buckets.delete(k);
      else buckets.set(k, fresh);
    }
  }
  return false;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

const NEGATIVE = { exists: false, has_qualification: false } as const;

export const Route = createFileRoute("/api/public/lookup-lead")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Rate limit (best-effort).
        if (rateLimited(hashIp(request))) {
          // Constant-shape negative response — never reveals state.
          return json(NEGATIVE, 200);
        }

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return json(NEGATIVE, 200);
        }

        const parsed = RequestSchema.safeParse(payload);
        if (!parsed.success) {
          return json(NEGATIVE, 200);
        }

        try {
          const { data: lead } = await (supabaseAdmin as any)
            .from("leads")
            .select("id, profile_ownership, purpose, user_type")
            .eq("email_normalized", parsed.data.email)
            .maybeSingle();

          if (!lead) return json(NEGATIVE, 200);

          const hasQualification = Boolean(
            lead.profile_ownership && lead.purpose && lead.user_type,
          );
          return json(
            { exists: true, has_qualification: hasQualification },
            200,
          );
        } catch (err) {
          console.error("[lookup-lead] error:", err);
          // Conservative: pretend nothing exists so the modal asks the
          // 3 questions and the user is never blocked.
          return json(NEGATIVE, 200);
        }
      },
    },
  },
});