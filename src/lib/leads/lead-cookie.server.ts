/**
 * Lead session cookie.
 *
 * The onboarding modal creates a lead row (not a Supabase auth user) and
 * binds the visitor to it via this cookie. The cookie carries only the
 * `leadId` plus an issued-at timestamp, signed with HMAC-SHA256 over
 * `SESSION_SECRET`. No PII.
 *
 * Format (single cookie value): `<leadId>.<issuedAtSec>.<sigBase64Url>`.
 * Rotating `SESSION_SECRET` invalidates every cookie.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";

export const LEAD_COOKIE_NAME = "lead_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year
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

function sign(payload: string): string {
  return createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Encode `{ leadId, issuedAtSec }` into the signed cookie value. */
export function encodeLeadCookie(leadId: string): string {
  if (!UUID_RE.test(leadId)) {
    throw new Error("encodeLeadCookie: invalid leadId");
  }
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `${leadId}.${issuedAt}`;
  return `${payload}.${sign(payload)}`;
}

/**
 * Parse-and-verify a cookie value. Returns `null` for any tampering, bad
 * shape, unknown signature, or missing secret error.
 */
export function decodeLeadCookie(
  raw: string | undefined | null,
): { leadId: string; issuedAtSec: number } | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [leadId, issuedAtStr, sig] = parts;
  if (!UUID_RE.test(leadId)) return null;
  const issuedAtSec = Number(issuedAtStr);
  if (!Number.isFinite(issuedAtSec) || issuedAtSec <= 0) return null;

  let expected: string;
  try {
    expected = sign(`${leadId}.${issuedAtSec}`);
  } catch {
    return null;
  }
  if (!safeEqual(sig, expected)) return null;
  return { leadId, issuedAtSec };
}

/** Read + verify the cookie from the current server request. */
export function getLeadFromCookie(): string | null {
  const raw = getCookie(LEAD_COOKIE_NAME);
  return decodeLeadCookie(raw)?.leadId ?? null;
}

/**
 * Read + verify the lead cookie directly from a `Request` object. Used by
 * handlers that prefer to keep the request explicit (e.g. server routes
 * that don't rely on AsyncLocalStorage-bound `getCookie`).
 *
 * Returns the verified `leadId` or `null` for missing / invalid / tampered
 * cookies.
 */
export function readLeadIdFromRequest(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const target = `${LEAD_COOKIE_NAME}=`;
  // Cookie header is `name=value; name=value; ...`. Parse without external
  // deps so we stay free of brittle cookie libraries.
  for (const segment of header.split(";")) {
    const trimmed = segment.trim();
    if (!trimmed.startsWith(target)) continue;
    const raw = decodeURIComponent(trimmed.slice(target.length));
    return decodeLeadCookie(raw)?.leadId ?? null;
  }
  return null;
}

/** Write the signed cookie on the current server response. */
export function setLeadCookie(leadId: string): void {
  setCookie(LEAD_COOKIE_NAME, encodeLeadCookie(leadId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Clear the cookie on the current server response. */
export function clearLeadCookie(): void {
  deleteCookie(LEAD_COOKIE_NAME, { path: "/" });
}