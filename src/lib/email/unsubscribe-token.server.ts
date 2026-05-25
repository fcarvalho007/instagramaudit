/**
 * Signed unsubscribe tokens — HMAC-SHA256.
 *
 * Format: `${base64url(payload)}.${base64url(signature)}`
 * Payload (JSON): `{ leadId: string, iat: number }` — `iat` is a unix epoch
 * in seconds. Tokens older than MAX_AGE_SECONDS are rejected, but the window
 * is long (1 year) so links in archived emails keep working.
 *
 * The signing secret comes from the `UNSUBSCRIBE_TOKEN_SECRET` env var. We
 * never throw on `verify` — invalid input always returns `null` so the
 * caller can render a neutral "request couldn't be processed" page.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 365 days

function getSecret(): string {
  const secret = process.env.UNSUBSCRIBE_TOKEN_SECRET?.trim();
  if (!secret) {
    throw new Error("UNSUBSCRIBE_TOKEN_SECRET is not configured");
  }
  return secret;
}

function b64urlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(input: string): Buffer | null {
  if (typeof input !== "string" || input.length === 0) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(input)) return null;
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  try {
    return Buffer.from(padded + pad, "base64");
  } catch {
    return null;
  }
}

function sign(payload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(payload).digest();
}

export function signUnsubscribeToken(leadId: string, now?: number): string {
  if (!leadId || typeof leadId !== "string") {
    throw new Error("leadId is required");
  }
  const secret = getSecret();
  const iat = Math.floor((now ?? Date.now()) / 1000);
  const payloadJson = JSON.stringify({ leadId, iat });
  const payloadB64 = b64urlEncode(payloadJson);
  const sigB64 = b64urlEncode(sign(payloadB64, secret));
  return `${payloadB64}.${sigB64}`;
}

export interface VerifiedUnsubscribeToken {
  leadId: string;
  iat: number;
}

export function verifyUnsubscribeToken(
  token: string,
  now?: number,
): VerifiedUnsubscribeToken | null {
  if (typeof token !== "string" || token.length === 0 || token.length > 4096) {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null;
  }

  const expected = sign(payloadB64, secret);
  const provided = b64urlDecode(sigB64);
  if (!provided || provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  const payloadBuf = b64urlDecode(payloadB64);
  if (!payloadBuf) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadBuf.toString("utf8"));
  } catch {
    return null;
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    typeof (parsed as { leadId?: unknown }).leadId !== "string" ||
    typeof (parsed as { iat?: unknown }).iat !== "number"
  ) {
    return null;
  }
  const { leadId, iat } = parsed as VerifiedUnsubscribeToken;
  const nowSeconds = Math.floor((now ?? Date.now()) / 1000);
  if (iat > nowSeconds + 60) return null; // clock skew tolerance
  if (nowSeconds - iat > MAX_AGE_SECONDS) return null;
  if (!leadId) return null;
  return { leadId, iat };
}
