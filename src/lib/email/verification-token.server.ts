/**
 * Signed email-verification tokens — HMAC-SHA256.
 *
 * Formato: `${base64url(payload)}.${base64url(signature)}`
 * Payload (JSON): `{ leadId, email, handle?, iat, exp }` (segundos epoch).
 *
 * Curto prazo (TTL 30 min) ao contrário do unsubscribe — um link de
 * verificação não tem motivo para sobreviver dias em caixas de entrada.
 *
 * Nunca lança em `verifyVerificationToken`: input inválido devolve `null`
 * para o endpoint poder renderizar uma página neutra.
 *
 * Segredo: `EMAIL_VERIFICATION_SECRET`. Falha de configuração devolve
 * `null` no `verify` e lança no `sign` (chamado só server-side).
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_SECONDS = 60 * 30; // 30 min

function getSecret(): string {
  const secret = process.env.EMAIL_VERIFICATION_SECRET?.trim();
  if (!secret) {
    throw new Error("EMAIL_VERIFICATION_SECRET is not configured");
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

export interface VerificationTokenPayload {
  leadId: string;
  email: string;
  handle?: string | null;
}

export interface VerifiedVerificationToken extends VerificationTokenPayload {
  iat: number;
  exp: number;
}

export function signVerificationToken(
  input: VerificationTokenPayload,
  now?: number,
): string {
  if (!input.leadId || !input.email) {
    throw new Error("leadId and email are required");
  }
  const secret = getSecret();
  const iat = Math.floor((now ?? Date.now()) / 1000);
  const exp = iat + TTL_SECONDS;
  const payload = {
    leadId: input.leadId,
    email: input.email.toLowerCase(),
    handle: input.handle?.trim() || null,
    iat,
    exp,
  };
  const payloadB64 = b64urlEncode(JSON.stringify(payload));
  const sigB64 = b64urlEncode(sign(payloadB64, secret));
  return `${payloadB64}.${sigB64}`;
}

export function verifyVerificationToken(
  token: string,
  now?: number,
): VerifiedVerificationToken | null {
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
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;
  if (
    typeof p.leadId !== "string" ||
    typeof p.email !== "string" ||
    typeof p.iat !== "number" ||
    typeof p.exp !== "number"
  ) {
    return null;
  }
  const nowSeconds = Math.floor((now ?? Date.now()) / 1000);
  if (p.iat > nowSeconds + 60) return null; // skew
  if (p.exp < nowSeconds) return null;
  return {
    leadId: p.leadId,
    email: p.email,
    handle: typeof p.handle === "string" ? p.handle : null,
    iat: p.iat,
    exp: p.exp,
  };
}

export const VERIFICATION_TOKEN_TTL_SECONDS = TTL_SECONDS;