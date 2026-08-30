/**
 * POST /api/onboarding/claim-existing
 *
 * Final step of the "existing email" path. The client has just verified
 * ownership of the email by completing Supabase Auth OTP. It hands us the
 * resulting `access_token`; we re-verify it server-side using the admin
 * client, match the auth user to a lead by normalized email, and emit our
 * own `lead_session` cookie so the rest of the product (report cache,
 * credits, snapshots) continues to work unchanged.
 *
 *   - Trust boundary: the access_token must be a valid Supabase JWT for an
 *     email-confirmed user; we never trust the client-supplied email.
 *   - If no lead exists yet for that email, we lazily create one so the
 *     user always gets a lead_session + the initial credit grant. This
 *     covers users that signed up directly via /login without ever
 *     completing the onboarding modal.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getBalance, grantInitialCredits } from "@/lib/credits/credits.server";
import { setLeadCookie } from "@/lib/leads/lead-cookie.server";

const Payload = z.object({
  access_token: z.string().min(20).max(4096),
  handle: z.string().trim().max(60).optional(),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function findOrCreateLeadForEmail(args: {
  email: string;
  userId: string;
}): Promise<{ leadId: string; isNew: boolean } | { error: string }> {
  const emailNormalized = args.email.toLowerCase();
  const existing = await supabaseAdmin
    .from("leads")
    .select("id")
    .eq("email_normalized", emailNormalized)
    .maybeSingle();
  if (existing.error) return { error: existing.error.message };
  if (existing.data) return { leadId: existing.data.id, isNew: false };

  // Lazy lead creation: auth user exists but never went through the modal.
  // Mark `gdpr_consent_at` as null on purpose — the user already accepted
  // GDPR when they originally signed up via /signup; we don't fabricate it.
  const inserted = await supabaseAdmin
    .from("leads")
    .insert({
      name: args.email.split("@")[0] ?? "",
      email: args.email,
      email_normalized: emailNormalized,
      source: "otp_claim",
    })
    .select("id")
    .single();
  if (inserted.error || !inserted.data) {
    return { error: inserted.error?.message ?? "insert failed" };
  }
  return { leadId: inserted.data.id, isNew: true };
}

export async function handleClaimExisting(request: Request): Promise<Response> {
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

  // Re-verify the bearer token with Supabase. This rejects forged or
  // tampered tokens, expired sessions, and tokens from another project.
  const userResp = await supabaseAdmin.auth.getUser(parsed.data.access_token);
  const authUser = userResp.data.user;
  const authEmail = authUser?.email;
  if (userResp.error || !authUser || !authEmail) {
    return json({ ok: false, error_code: "INVALID_TOKEN" }, 401);
  }
  if (!authUser.email_confirmed_at) {
    return json({ ok: false, error_code: "EMAIL_UNCONFIRMED" }, 401);
  }

  const result = await findOrCreateLeadForEmail({
    email: authEmail,
    userId: authUser.id,
  });
  if ("error" in result) {
    console.error("[onboarding/claim-existing] lead lookup failed", result.error);
    return json({ ok: false, error_code: "PERSISTENCE_FAILED" }, 500);
  }

  // Grant initial credits — idempotent via the partial unique index on
  // credit_ledger; safe to call for both new and returning leads.
  try {
    await grantInitialCredits(result.leadId);
  } catch (err) {
    console.warn("[onboarding/claim-existing] grant skipped", err);
  }

  try {
    setLeadCookie(result.leadId);
  } catch (err) {
    console.error("[onboarding/claim-existing] cookie write failed", err);
    return json({ ok: false, error_code: "INTERNAL_ERROR" }, 500);
  }

  // Ponte "snapshot anónimo → lead" também no login pós-valor: quem viu a
  // auditoria base sem sessão e entrou depois passa a ser dono do relatório.
  if (parsed.data.handle) {
    try {
      const { claimAnonymousBaselineReport } = await import(
        "@/lib/credits/lead-reports.server"
      );
      await claimAnonymousBaselineReport({
        leadId: result.leadId,
        handle: parsed.data.handle,
      });
    } catch (err) {
      console.warn("[onboarding/claim-existing] baseline claim failed", err);
    }
  }

  let credits = 0;
  try {
    credits = await getBalance(result.leadId);
  } catch (err) {
    console.warn("[onboarding/claim-existing] balance read failed", err);
  }

  return json({ ok: true, lead_id: result.leadId, credits });
}

export const Route = createFileRoute("/api/onboarding/claim-existing")({
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
      POST: async ({ request }) => handleClaimExisting(request),
    },
  },
});