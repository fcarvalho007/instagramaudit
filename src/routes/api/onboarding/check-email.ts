/**
 * POST /api/onboarding/check-email
 *
 * Tells the client whether the email already belongs to a lead.
 *
 *   - `exists: false` → caller may proceed to the "new account" final step.
 *   - `exists: true`  → caller must run the OTP verification path. The
 *                       `/api/onboarding/start` endpoint also enforces this
 *                       (defense-in-depth) by rejecting payloads whose email
 *                       already maps to a lead.
 *
 * Constant-time response (≥200ms) to avoid email-enumeration timing leaks.
 * Always returns 200 unless the payload is structurally invalid.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const Payload = z.object({
  email: z.string().trim().email().max(255),
});

const FLOOR_MS = 200;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function leadExists(emailNormalized: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("id")
    .eq("email_normalized", emailNormalized)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[onboarding/check-email] db error", error.message);
    // Fail closed: treat as "exists" so the flow falls into OTP rather than
    // letting the attacker bypass verification on a transient error.
    return true;
  }
  return Boolean(data);
}

export async function handleCheckEmail(request: Request): Promise<Response> {
  const startedAt = Date.now();
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, error_code: "INVALID_PAYLOAD" }, 400);
  }
  const parsed = Payload.safeParse(raw);
  if (!parsed.success) {
    return json({ ok: false, error_code: "INVALID_PAYLOAD" }, 400);
  }
  const exists = await leadExists(parsed.data.email.toLowerCase());

  const elapsed = Date.now() - startedAt;
  if (elapsed < FLOOR_MS) {
    await new Promise((r) => setTimeout(r, FLOOR_MS - elapsed));
  }
  return json({ ok: true, exists });
}

export const Route = createFileRoute("/api/onboarding/check-email")({
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
      POST: async ({ request }) => handleCheckEmail(request),
    },
  },
});