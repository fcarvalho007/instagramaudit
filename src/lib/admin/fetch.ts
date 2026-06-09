/**
 * Helper para chamadas client-side a /api/admin/*.
 *
 * A autenticação é feita 100% server-side via cookie `admin_session`
 * (HttpOnly, HMAC, TTL 8h) emitido por `/api/admin/simple-login`. Aqui só
 * garantimos que o fetch inclui o cookie e que limpamos o flag local em
 * 401/403 para o gate reaparecer.
 */

import { ADMIN_GATE_STORAGE_KEY, clearAdminEmail } from "./simple-gate";

export { ADMIN_GATE_STORAGE_KEY };

/**
 * Em 401/403 o email guardado já não é válido — limpamos e recarregamos
 * para que o gate apareça outra vez.
 */
function handleUnauthorized(): void {
  // Limpa o email guardado e despacha um evento global para que o
  // `AdminAuthShell` mostre imediatamente o gate (sem refresh manual nem
  // cascata de "Erro ao carregar HTTP 401" em cada card).
  clearAdminEmail();
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("admin:session-expired"));
    } catch {
      /* ignore */
    }
  }
}

export async function adminFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  // `credentials: "include"` garante envio do cookie HttpOnly mesmo em
  // contextos onde o default seria `same-origin` (ex: preview iframe).
  const res = await fetch(input, { ...init, headers, credentials: "include" });
  if (res.status === 401 || res.status === 403) {
    handleUnauthorized();
  }
  return res;
}