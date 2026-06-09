/**
 * Admin session cookie — HttpOnly, HMAC-assinado, TTL curto.
 *
 * Substitui o header `X-Admin-Email` (forjável por qualquer pessoa que
 * conheça um email da allowlist) por uma sessão server-issued. Só o
 * `/api/admin/simple-login` consegue emitir um cookie válido, e só depois
 * de validar email (allowlist) + password partilhada (ADMIN_LOGIN_PASSWORD).
 *
 * Formato: `<emailB64Url>.<issuedAtSec>.<sigBase64Url>`.
 * Sign secret: `SESSION_SECRET` (já existente e ≥32 chars).
 * TTL: 8h. Rotação do `SESSION_SECRET` invalida todas as sessões.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import {
  deleteCookie,
  getCookie,
  setResponseHeader,
} from "@tanstack/react-start/server";

export const ADMIN_COOKIE_NAME = "admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8h

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET missing or too short (need at least 32 chars).",
    );
  }
  return secret;
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

function encodeEmail(email: string): string {
  return Buffer.from(email, "utf8").toString("base64url");
}

function decodeEmail(b64: string): string | null {
  try {
    const out = Buffer.from(b64, "base64url").toString("utf8");
    return out.length > 0 && out.length <= 255 ? out : null;
  } catch {
    return null;
  }
}

export function encodeAdminCookie(email: string): string {
  const normalized = email.trim().toLowerCase();
  if (!normalized) throw new Error("encodeAdminCookie: empty email");
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `${encodeEmail(normalized)}.${issuedAt}`;
  return `${payload}.${sign(payload)}`;
}

export function decodeAdminCookie(
  raw: string | undefined | null,
): { email: string; issuedAtSec: number } | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [emailB64, issuedAtStr, sig] = parts;
  const issuedAtSec = Number(issuedAtStr);
  if (!Number.isFinite(issuedAtSec) || issuedAtSec <= 0) return null;

  // Enforce TTL server-side (defense vs replay of leaked cookie).
  const ageSec = Math.floor(Date.now() / 1000) - issuedAtSec;
  if (ageSec > MAX_AGE_SECONDS || ageSec < -60) return null;

  let expected: string;
  try {
    expected = sign(`${emailB64}.${issuedAtSec}`);
  } catch {
    return null;
  }
  if (!safeEqual(sig, expected)) return null;

  const email = decodeEmail(emailB64);
  if (!email) return null;
  return { email, issuedAtSec };
}

export function getAdminEmailFromCookie(): string | null {
  const raw = getCookie(ADMIN_COOKIE_NAME);
  return decodeAdminCookie(raw)?.email ?? null;
}

export function setAdminCookie(email: string): void {
  const value = encodeAdminCookie(email);
  const parts = [
    `${ADMIN_COOKIE_NAME}=${value}`,
    `Max-Age=${MAX_AGE_SECONDS}`,
    `Path=/`,
    `HttpOnly`,
    `Secure`,
    `SameSite=Lax`,
  ];
  setResponseHeader("set-cookie", parts.join("; "));
}

export function clearAdminCookie(): void {
  deleteCookie(ADMIN_COOKIE_NAME, { path: "/" });
}