/**
 * Minimal EuPago provider client (server-only).
 *
 * Two responsibilities:
 *   1. Create a Pay By Link checkout via EuPago REST API.
 *   2. Verify webhook signatures using `EUPAGO_WEBHOOK_SECRET` (HMAC-SHA256
 *      over the raw request body).
 *
 * EuPago Webhooks 2.0 supports two signing modes. We accept either:
 *   - `x-eupago-signature` header containing a hex HMAC-SHA256 of the raw
 *     body (most common), or
 *   - a `signature` field inside the JSON payload.
 *
 * If your EuPago account uses AES encryption instead of HMAC, swap
 * `verifyWebhookSignature` with a decryption helper — the public surface
 * (input/output) stays the same.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export interface EuPagoCheckoutInput {
  productCode: string;
  amountCents: number;
  currency: "EUR";
  description: string;
  internalPaymentId: string;
  returnUrl: string;
  webhookUrl: string;
  customerEmail?: string | null;
}

export interface EuPagoCheckoutResult {
  providerPaymentId: string;
  providerReference: string | null;
  checkoutUrl: string;
  raw: unknown;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

const DEFAULT_PAYBYLINK_PATH = "/api/v1.02/paybylink/create";

function resolvePayByLinkPath(): string {
  const raw = process.env.EUPAGO_PAYBYLINK_PATH?.trim();
  const path = raw && raw.length > 0 ? raw : DEFAULT_PAYBYLINK_PATH;
  const withLeading = path.startsWith("/") ? path : `/${path}`;
  return withLeading.replace(/\/+$/, "");
}

/**
 * Redact anything that looks like a credential before logging or throwing.
 * Keeps debugging useful without ever leaking the API key.
 */
function sanitize(text: string): string {
  if (!text) return text;
  const apiKey = process.env.EUPAGO_API_KEY;
  let out = text;
  if (apiKey) {
    out = out.split(apiKey).join("[REDACTED_API_KEY]");
  }
  out = out.replace(/ApiKey\s+[A-Za-z0-9._-]+/gi, "ApiKey [REDACTED]");
  out = out.replace(/Authorization"?\s*:\s*"?[^",}\s]+/gi, 'Authorization":"[REDACTED]"');
  return out.length > 500 ? `${out.slice(0, 500)}…` : out;
}

/**
 * Create a Pay By Link payment. The exact endpoint depends on your EuPago
 * account contract — `EUPAGO_BASE_URL` is read from env so we can swap
 * between sandbox and production without code changes. The path under
 * that host is configurable via `EUPAGO_PAYBYLINK_PATH` (defaults to
 * `/api/v1.02/paybylink/create`, the current REST API contract).
 */
export async function createEupagoCheckout(
  input: EuPagoCheckoutInput,
): Promise<EuPagoCheckoutResult> {
  const baseUrl = requireEnv("EUPAGO_BASE_URL").replace(/\/+$/, "");
  const apiKey = requireEnv("EUPAGO_API_KEY");
  const channelId = process.env.EUPAGO_CHANNEL_ID || undefined;
  const path = resolvePayByLinkPath();

  const amountEuros = (input.amountCents / 100).toFixed(2);

  // Pay By Link payload — keeps both MB WAY and Multibanco available on a
  // single checkout URL. `identifier` is our internal payment id so we can
  // correlate the webhook back to the row.
  const body: Record<string, unknown> = {
    payment: {
      amount: { value: Number(amountEuros), currency: input.currency },
      identifier: input.internalPaymentId,
      description: input.description,
      successUrl: input.returnUrl,
      failUrl: input.returnUrl,
      backUrl: input.returnUrl,
      notificationUrl: input.webhookUrl,
    },
    customer: input.customerEmail
      ? { email: input.customerEmail }
      : undefined,
    channel: channelId ? { id: channelId } : undefined,
  };

  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `ApiKey ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  // Read as text first so empty/non-JSON 4xx/5xx bodies still produce a
  // useful, sanitized error message instead of swallowing it as `null`.
  const rawText = await res.text().catch(() => "");
  let raw: Record<string, unknown> | null = null;
  if (rawText) {
    try {
      raw = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      raw = null;
    }
  }

  if (!res.ok || !raw) {
    const snippet = sanitize(rawText || "(empty body)");
    // eslint-disable-next-line no-console
    console.error("[eupago] checkout failed", {
      status: res.status,
      path,
      bodySnippet: snippet,
    });
    throw new Error(
      `EuPago checkout failed (${res.status} ${path}): ${snippet}`,
    );
  }

  // EuPago Pay By Link typically returns `{ transactionStatus, reference,
  // redirectUrl }` or `{ payment: { id, ... }, redirectUrl }`. Be defensive.
  const checkoutUrl =
    (raw.redirectUrl as string | undefined) ??
    (raw.url as string | undefined) ??
    ((raw.payment as { redirectUrl?: string } | undefined)?.redirectUrl);

  const providerPaymentId =
    ((raw.payment as { id?: string } | undefined)?.id) ??
    (raw.transactionID as string | undefined) ??
    (raw.reference as string | undefined) ??
    input.internalPaymentId;

  const providerReference =
    (raw.reference as string | undefined) ??
    ((raw.payment as { reference?: string } | undefined)?.reference) ??
    null;

  if (!checkoutUrl) {
    throw new Error(
      `EuPago response missing checkout URL: ${JSON.stringify(raw)}`,
    );
  }

  return { providerPaymentId, providerReference, checkoutUrl, raw };
}

/**
 * HMAC-SHA256 verification of the raw webhook body. Returns true when the
 * signature matches `EUPAGO_WEBHOOK_SECRET`. Constant-time compare.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
): boolean {
  if (!signature) return false;
  const secret = process.env.EUPAGO_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const sigHex = signature.trim().toLowerCase();
  if (sigHex.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(sigHex), Buffer.from(expected));
  } catch {
    return false;
  }
}