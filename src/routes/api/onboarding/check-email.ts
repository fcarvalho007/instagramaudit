/**
 * POST /api/onboarding/check-email
 *
 * Tells the client whether the email already belongs to a lead.
 *
 *   - `exists: false` → caller may proceed to the "new account" final
 *                       step (which collects a user-defined password).
 *   - `exists: true`  → caller must show the login form (email +
 *                       password). `/api/onboarding/start` rejects any
 *                       email already mapped to an auth user, defense-
 *                       in-depth.
 *
 * Constant-time response (≥200ms) to avoid email-enumeration timing leaks.
 * Always returns 200 unless the payload is structurally invalid.
 *
 * NOTE: this endpoint never sends emails. In legacy `magic_link` mode it
 * used to enqueue a signed link here; under `AUTH_MODE=password` no email
 * is sent and no session is granted — proof of ownership is the password.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAuthMode } from "@/lib/config/auth-mode.server";

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
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[onboarding/check-email] db error", error.message);
    return "error";
  }
  return data ?? null;
}

/**
 * Defense-in-depth: an auth user may exist without a lead row (legacy
 * `/signup` flow, future OAuth, etc.). If we only checked `leads` we
 * would tell the modal "new email", then `/start` would reject 409 on
 * `admin.createUser`. Checking `auth.users` up front gives the client
 * the login screen immediately. Paginated to handle >50 users.
 */
async function authUserExists(emailNormalized: string): Promise<boolean | "error"> {
  const perPage = 200;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      console.warn("[onboarding/check-email] auth.listUsers error", error.message);
      return "error";
    }
    const users = data?.users ?? [];
    for (const u of users) {
      if ((u.email ?? "").toLowerCase() === emailNormalized) return true;
    }
    if (users.length < perPage) return false;
  }
  return false;
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
  const mode = getAuthMode();
  const emailNormalized = parsed.data.email.toLowerCase();
  const lookup = await findLead(emailNormalized);

  // Fail closed: erro transiente → comporta-te como "exists" na vertente
  // segura (cliente cai no fluxo de login, password é a prova).
  let exists = lookup === "error" ? true : Boolean(lookup);

  // Se não há lead, verifica também auth.users — cobre o caso em que
  // um auth user existe sem lead correspondente (legacy /signup, OAuth).
  if (!exists) {
    const authCheck = await authUserExists(emailNormalized);
    if (authCheck === "error") exists = true;
    else if (authCheck) exists = true;
  }

  const body: Record<string, unknown> = {
    ok: true,
    exists,
    auth_mode: mode,
  };

  // No email is sent here under any mode. Existing emails proceed to the
  // password login view; new emails proceed to account creation.

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