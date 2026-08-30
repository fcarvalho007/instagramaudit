/**
 * Grant de âmbito restrito (Ronda 4).
 *
 * Quando o email submetido pertence a um lead que já existe, NÃO emitimos
 * cookie de sessão: um email sozinho não pode dar acesso ao histórico de
 * outra pessoa. Em vez disso devolvemos um token assinado, válido apenas
 * para o par (lead, cache_key) do relatório que a pessoa tem à frente e
 * por um período curto. Serve para responder à pergunta de relação sem
 * expor relatórios, créditos ou dados anteriores.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_SECONDS = 60 * 60 * 24; // 24 h

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET missing or too short (need 32+ chars).");
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function signScopedGrant(leadId: string, cacheKey: string): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `${leadId}.${issuedAt}`;
  return `${payload}.${sign(`${payload}.${cacheKey}`)}`;
}

/** Devolve o `leadId` quando o grant é válido para este `cacheKey`. */
export function verifyScopedGrant(
  token: string | null | undefined,
  cacheKey: string,
): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [leadId, issuedAtStr, sig] = parts;
  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt) || issuedAt <= 0) return null;
  const age = Math.floor(Date.now() / 1000) - issuedAt;
  if (age > TTL_SECONDS || age < -60) return null;
  let expected: string;
  try {
    expected = sign(`${leadId}.${issuedAt}.${cacheKey}`);
  } catch {
    return null;
  }
  return safeEqual(sig, expected) ? leadId : null;
}
