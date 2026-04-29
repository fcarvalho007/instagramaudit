/**
 * Helper para chamadas client-side a /api/admin/*.
 *
 * Lê o email do admin guardado em localStorage (gate simples) e injeta-o
 * no header `X-Admin-Email`. Os handlers server-side validam contra a
 * allowlist em `requireAdminSession()`.
 */

import { ADMIN_GATE_STORAGE_KEY, clearAdminEmail, readAdminEmail } from "./simple-gate";

export { ADMIN_GATE_STORAGE_KEY };

/**
 * Em 401/403 o email guardado já não é válido — limpamos e recarregamos
 * para que o gate apareça outra vez.
 */
let resetting = false;
function handleUnauthorized(): void {
  if (resetting) return;
  resetting = true;
  clearAdminEmail();
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

export async function adminFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const email = readAdminEmail();
  const headers = new Headers(init.headers);
  if (email) {
    headers.set("X-Admin-Email", email);
  }

  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 || res.status === 403) {
    handleUnauthorized();
  }
  return res;
}