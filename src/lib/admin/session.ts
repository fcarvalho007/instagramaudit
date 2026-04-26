/**
 * Admin session helpers.
 *
 * Acesso administrativo via Google Sign-in (Lovable Cloud) com allowlist de
 * emails definida em `ADMIN_ALLOWED_EMAILS` (CSV, lowercase). O JWT do
 * Supabase é lido do header `Authorization: Bearer <token>` (enviado pelos
 * fetchers do client) e validado com o admin client.
 */

import { getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface AdminUser {
  id: string;
  email: string;
}

function jsonError(status: number, code: string, message: string): Response {
  return new Response(
    JSON.stringify({ success: false, error_code: code, message }),
    { status, headers: { "Content-Type": "application/json" } },
  );
}

/**
 * Devolve a allowlist (lowercase, trimmed) configurada em
 * ADMIN_ALLOWED_EMAILS. Lista vazia significa fail-closed.
 */
export function getAdminAllowlist(): string[] {
  const raw = process.env.ADMIN_ALLOWED_EMAILS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

export function isAdminEmailAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = getAdminAllowlist();
  if (allowlist.length === 0) return false;
  return allowlist.includes(email.toLowerCase());
}

function extractBearerToken(): string | null {
  const auth = getRequestHeader("authorization") ?? getRequestHeader("Authorization");
  if (!auth) return null;
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return match ? match[1].trim() : null;
}

/**
 * Throws a Response (401/403) when the caller is not an authenticated admin.
 * Use at the top of any /api/admin/* handler.
 *
 * Returns the authenticated admin user when authorized.
 */
export async function requireAdminSession(): Promise<AdminUser> {
  const token = extractBearerToken();
  if (!token) {
    throw jsonError(401, "UNAUTHENTICATED", "Sessão em falta. Inicia sessão com Google.");
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    throw jsonError(401, "INVALID_SESSION", "Sessão inválida ou expirada.");
  }

  const email = data.user.email ?? null;
  if (!isAdminEmailAllowed(email)) {
    throw jsonError(403, "NOT_ALLOWED", "Email não autorizado para acesso administrativo.");
  }

  return { id: data.user.id, email: email as string };
}
