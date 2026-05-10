/**
 * Public unlock-check endpoint for the unlock modal.
 *
 * POST /api/public/unlock-check   { email }
 *   → 200 {
 *       exists: boolean,
 *       knownFields: Array<"profile_ownership" | "goal" | "user_type">,
 *       missingFields: Array<...same...>,
 *       display: { firstName: string | null }
 *     }
 *
 * Per-field discovery so the modal can skip exactly the steps already
 * answered by a returning lead. `purpose` (DB) is exposed as `goal`
 * (form vocabulary) for UI alignment.
 *
 * Security:
 * - Constant-shape JSON in every branch — no enumeration via response shape.
 * - In-memory rate-limit per IP-hash (5 req / 60 s); over the limit returns
 *   the negative shape so the unlock flow is never blocked.
 * - No lead_id, no email echo, no handle, no timestamps in the payload.
 * - `firstName` only when exists=true; consumer is expected to display it
 *   only in welcome states (whole qualification known).
 */

import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const QUALIFICATION_FIELDS = [
  "profile_ownership",
  "goal",
  "user_type",
] as const;
export type QualificationField = (typeof QUALIFICATION_FIELDS)[number];

export interface UnlockCheckResponse {
  exists: boolean;
  knownFields: QualificationField[];
  missingFields: QualificationField[];
  display: { firstName: string | null };
}

export interface LeadRowForCheck {
  profile_ownership: string | null;
  purpose: string | null;
  user_type: string | null;
  name: string | null;
}

const NEGATIVE: UnlockCheckResponse = {
  exists: false,
  knownFields: [],
  missingFields: [...QUALIFICATION_FIELDS],
  display: { firstName: null },
};

function deriveFirstName(name: string | null): string | null {
  if (!name) return null;
  const first = name.trim().split(/\s+/)[0];
  if (!first) return null;
  return first.slice(0, 40);
}

/**
 * Pure mapper: lead row → public response. Exported for unit tests.
 */
export function buildUnlockCheckResponse(
  lead: LeadRowForCheck | null | undefined,
): UnlockCheckResponse {
  if (!lead) return { ...NEGATIVE };

  const known: QualificationField[] = [];
  if (lead.profile_ownership) known.push("profile_ownership");
  if (lead.purpose) known.push("goal");
  if (lead.user_type) known.push("user_type");

  const missing = QUALIFICATION_FIELDS.filter(
    (f) => !known.includes(f),
  ) as QualificationField[];

  return {
    exists: true,
    knownFields: known,
    missingFields: missing,
    display: { firstName: deriveFirstName(lead.name) },
  };
}

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

export const Route = createFileRoute("/api/public/unlock-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (rateLimited(hashIp(request))) {
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
            .select("profile_ownership, purpose, user_type, name")
            .eq("email_normalized", parsed.data.email)
            .maybeSingle();

          return json(buildUnlockCheckResponse(lead as LeadRowForCheck | null), 200);
        } catch (err) {
          console.error("[unlock-check] error:", err);
          return json(NEGATIVE, 200);
        }
      },
    },
  },
});