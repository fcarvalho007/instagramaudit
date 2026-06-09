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
import { getEmailVerificationMode } from "@/lib/config/email-verification.server";
import { sendVerificationEmail } from "@/lib/email/send-verification.server";

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

async function findLead(
  emailNormalized: string,
): Promise<{ id: string; name: string | null } | null | "error"> {
  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("id, name")
    .eq("email_normalized", emailNormalized)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[onboarding/check-email] db error", error.message);
    return "error";
  }
  return data ?? null;
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
  const mode = getEmailVerificationMode();
  const emailNormalized = parsed.data.email.toLowerCase();
  const lookup = await findLead(emailNormalized);

  // Fail closed: erro transiente → comporta-te como "exists" na vertente
  // segura (não emite cookie sem verificação).
  const exists = lookup === "error" ? true : Boolean(lookup);

  let body: Record<string, unknown> = {
    ok: true,
    exists,
    verification_mode: mode,
  };

  if (exists && lookup && lookup !== "error") {
    // Segurança: NUNCA emitir cookie/créditos só porque alguém escreveu
    // um email conhecido. Email existente exige sempre prova de
    // propriedade. Em modos `off` e `magic_link` enviamos um magic link
    // assinado pela nossa stack (Brevo → Resend). Em `otp` deixamos o
    // cliente fazer `signInWithOtp` legacy.
    if (mode === "off" || mode === "magic_link") {
      void sendVerificationEmail({
        leadId: lookup.id,
        toEmail: parsed.data.email,
        firstName: lookup.name?.split(/\s+/)[0] ?? null,
        instagramHandle: null,
      });
      body = {
        ok: true,
        exists: true,
        verification_mode: mode,
        verification_sent: true,
      };
    }
    // mode === "otp": cliente faz signInWithOtp legacy.
  }

  const elapsed = Date.now() - startedAt;
  if (elapsed < FLOOR_MS) {
    await new Promise((r) => setTimeout(r, FLOOR_MS - elapsed));
  }
  return json(body);
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