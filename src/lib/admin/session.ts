/**
 * Admin session helpers.
 *
 * A sessão é estabelecida em `/api/admin/simple-login` (email da allowlist
 * + `ADMIN_LOGIN_PASSWORD`) e materializada como cookie HttpOnly assinado
 * com HMAC sobre `SESSION_SECRET` (ver `cookie.server.ts`). O header
 * `X-Admin-Email` foi descontinuado — saber um email da allowlist já não
 * chega para passar pela gate.
 */

import { getAdminEmailFromCookie } from "./cookie.server";

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

/**
 * Throws a Response (401/403) when the caller is not an authenticated admin.
 * Use at the top of any /api/admin/* handler.
 *
 * Returns the authenticated admin user when authorized.
 */
export async function requireAdminSession(): Promise<AdminUser> {
  const email = getAdminEmailFromCookie();
  if (!email) {
    throw jsonError(401, "UNAUTHENTICATED", "Sessão em falta. Inicia sessão no /admin.");
  }
  if (!isAdminEmailAllowed(email)) {
    throw jsonError(403, "NOT_ALLOWED", "Email não autorizado para acesso administrativo.");
  }
  // Em modo simples não há `auth.users.id` — usamos o próprio email como id
  // estável para os logs. Os handlers que registam quem fez a alteração
  // continuam a ter um identificador.
  return { id: email, email };
}
