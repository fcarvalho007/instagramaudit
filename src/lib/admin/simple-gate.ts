/**
 * Gate simples do admin (modo testes privados).
 *
 * O cliente guarda em `localStorage` o email validado contra a allowlist
 * pelo handler `/api/admin/simple-login`. Sem JWT, sem cookies. O backend
 * valida o email enviado em `X-Admin-Email` em cada pedido.
 *
 * Risco aceite explicitamente pelo owner: qualquer pessoa que descubra
 * o email autorizado consegue entrar. Documentado na security memory.
 */

export const ADMIN_GATE_STORAGE_KEY = "admin.simple-gate.v1";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readAdminEmail(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(ADMIN_GATE_STORAGE_KEY);
    if (!raw) return null;
    const trimmed = raw.trim().toLowerCase();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export function writeAdminEmail(email: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(ADMIN_GATE_STORAGE_KEY, email.trim().toLowerCase());
  } catch {
    /* ignore quota errors */
  }
}

export function clearAdminEmail(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(ADMIN_GATE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}