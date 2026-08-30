/**
 * `report_capture_session` — acesso de âmbito restrito antes da verificação
 * de email (Ronda 4).
 *
 * Escrever um email não prova propriedade desse email. Por isso a captura
 * pós-valor NÃO emite `lead_session` (sessão global, 90 dias, acesso a todos
 * os `lead_reports` do lead). Emite este cookie, válido apenas para o par
 * (lead, cache_key) do relatório que a pessoa está a ver, durante 24 horas.
 *
 * Formato: `<leadId>.<cacheKeyHash>.<issuedAtSec>.<sigBase64Url>`.
 * A `cache_key` nunca é escrita em claro no cookie — guardamos só o hash,
 * que é suficiente para comparar com a `cache_key` pedida pelo endpoint.
 *
 * A promoção para sessão completa continua a ser exclusiva do fluxo de
 * verificação de email (`/api/public/verify-email`).
 */

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { setResponseHeader } from "@tanstack/react-start/server";

export const CAPTURE_COOKIE_NAME = "report_capture_session";
/** TTL curto e deliberado: é um acesso não verificado. */
export const CAPTURE_TTL_SECONDS = 60 * 60 * 24; // 24 h

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET missing or too short (need at least 32 chars).",
    );
  }
  return secret;
}

function hashCacheKey(cacheKey: string): string {
  return createHash("sha256").update(cacheKey).digest("base64url").slice(0, 24);
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function encodeCaptureSession(leadId: string, cacheKey: string): string {
  if (!UUID_RE.test(leadId)) {
    throw new Error("encodeCaptureSession: invalid leadId");
  }
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `${leadId}.${hashCacheKey(cacheKey)}.${issuedAt}`;
  return `${payload}.${sign(payload)}`;
}

/**
 * Verifica o cookie e confirma que o âmbito corresponde à `cache_key`
 * pedida. Devolve o `leadId` ou `null`.
 */
export function decodeCaptureSession(
  raw: string | undefined | null,
  cacheKey: string,
): string | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 4) return null;
  const [leadId, scope, issuedAtStr, sig] = parts;
  if (!UUID_RE.test(leadId)) return null;
  if (scope !== hashCacheKey(cacheKey)) return null;

  const issuedAtSec = Number(issuedAtStr);
  if (!Number.isFinite(issuedAtSec) || issuedAtSec <= 0) return null;
  const ageSec = Math.floor(Date.now() / 1000) - issuedAtSec;
  if (ageSec > CAPTURE_TTL_SECONDS || ageSec < -60) return null;

  let expected: string;
  try {
    expected = sign(`${leadId}.${scope}.${issuedAtSec}`);
  } catch {
    return null;
  }
  if (!safeEqual(sig, expected)) return null;
  return leadId;
}

/** Lê e verifica o cookie a partir de um `Request`, para uma `cache_key`. */
export function readCaptureLeadIdFromRequest(
  request: Request,
  cacheKey: string,
): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const target = `${CAPTURE_COOKIE_NAME}=`;
  for (const segment of header.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed.startsWith(target)) continue;
    const raw = decodeURIComponent(trimmed.slice(target.length));
    return decodeCaptureSession(raw, cacheKey);
  }
  return null;
}

/** Escreve o cookie scoped na resposta actual. */
export function setCaptureSessionCookie(leadId: string, cacheKey: string): void {
  const value = encodeCaptureSession(leadId, cacheKey);
  const parts = [
    `${CAPTURE_COOKIE_NAME}=${value}`,
    `Max-Age=${CAPTURE_TTL_SECONDS}`,
    `Path=/`,
    `HttpOnly`,
    `Secure`,
    `SameSite=None`,
    `Partitioned`,
  ];
  setResponseHeader("set-cookie", parts.join("; "));
}
