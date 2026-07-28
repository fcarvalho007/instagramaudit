/**
 * Resolve the current lead id for a request, tolerating callers that
 * authenticated via Supabase Auth but never went through the onboarding
 * modal (so no `lead_session` cookie was issued).
 *
 * Order:
 *   1. Signed `lead_session` cookie (fast path, no DB).
 *   2. `Authorization: Bearer <token>` → `profiles.lead_id`.
 *
 * When the auth fallback succeeds, we opportunistically emit the
 * `lead_session` cookie so subsequent requests skip the auth lookup.
 * Idempotent, fail-soft.
 */

import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";

import type { Database } from "@/integrations/supabase/types";
import { getLeadFromCookie, setLeadCookie } from "./lead-cookie.server";

export async function resolveCurrentLeadId(): Promise<string | null> {
  const cookieLead = safeCookie();
  if (cookieLead) return cookieLead;

  const request = safeRequest();
  if (!request) return null;

  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return null;
  const userId = claims.claims.sub;

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("lead_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr || !profile?.lead_id) return null;

  // Best-effort cookie emission — never throw.
  try {
    setLeadCookie(profile.lead_id);
  } catch {
    /* noop */
  }

  return profile.lead_id;
}

function safeCookie(): string | null {
  try {
    return getLeadFromCookie();
  } catch {
    return null;
  }
}

function safeRequest(): Request | null {
  try {
    return getRequest();
  } catch {
    return null;
  }
}