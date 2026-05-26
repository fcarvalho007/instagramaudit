/**
 * Transactional email sender — Brevo first, Resend fallback.
 *
 * Single server-only entry point for every transactional flow. Never throws.
 * Emits provider-level events (`brevo_email_sent`, `brevo_email_failed`,
 * `resend_fallback_email_sent`) and, on total failure, the flow-specific
 * failure event (e.g. `personal_area_email_failed`). Flow success events
 * (e.g. `personal_area_email_sent`) remain the caller's responsibility so
 * caller-specific metadata (report_request_id, status updates) is preserved.
 */

import { brevoFetch } from "@/lib/brevo/client.server";
import { recordProductEvent } from "@/lib/tracking.server";
import { resolveSender } from "./sender";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 8_000;

export type TxFlow =
  | "personal-area-saved"
  | "report-ready"
  | "feedback-request"
  | "request-received"
  | "commercial-followup"
  | "welcome-beta"
  | "report-summary";

export interface SendTransactionalEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  flowType: TxFlow;
  leadId: string | null;
  reportRequestId?: string | null;
  snapshotId?: string | null;
  handle?: string | null;
  metadata?: Record<string, unknown>;
}

export type SendTransactionalEmailResult =
  | {
      ok: true;
      provider: "brevo" | "resend";
      messageId: string | null;
      latencyMs: number;
      brevoFailed?: { reason: string };
    }
  | {
      ok: false;
      brevoReason: string;
      resendReason: string | null;
      latencyMs: number;
    };

const FLOW_FAILURE_EVENT: Record<TxFlow, string> = {
  "personal-area-saved": "personal_area_email_failed",
  "report-ready": "report_ready_email_failed",
  "feedback-request": "feedback_request_email_failed",
  "request-received": "request_received_email_failed",
  "commercial-followup": "commercial_followup_failed",
  "welcome-beta": "beta_welcome_email_failed",
  "report-summary": "report_summary_email_failed",
};

function maskEmail(email: string | null | undefined): string {
  if (!email) return "***";
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  return `${user.slice(0, 1)}***@${domain}`;
}

function baseEventCtx(input: SendTransactionalEmailInput) {
  return {
    leadId: input.leadId ?? undefined,
    snapshotId: input.snapshotId ?? undefined,
    handle: input.handle ?? undefined,
  };
}

function flowMetadata(input: SendTransactionalEmailInput) {
  return {
    flow_type: input.flowType,
    email_masked: maskEmail(input.to),
    report_request_id: input.reportRequestId ?? null,
    ...(input.metadata ?? {}),
  };
}

async function safeRecord(
  eventType: string,
  input: SendTransactionalEmailInput,
  extra: Record<string, unknown>,
): Promise<void> {
  try {
    await recordProductEvent({
      eventType: eventType as any,
      ...baseEventCtx(input),
      metadata: { ...flowMetadata(input), ...extra },
    });
  } catch (err) {
    console.error(`[tx-email] failed to record ${eventType}:`, err);
  }
}

interface ProviderResult {
  ok: boolean;
  messageId: string | null;
  reason: string | null;
  status: number | null;
  latencyMs: number;
}

async function sendViaBrevo(
  input: SendTransactionalEmailInput,
): Promise<ProviderResult> {
  const startedAt = Date.now();

  // Kill switch: BREVO_TRANSACTIONAL_ENABLED. Default ON; set to literal
  // "false" to skip Brevo and go straight to Resend fallback.
  if ((process.env.BREVO_TRANSACTIONAL_ENABLED ?? "true").trim().toLowerCase() === "false") {
    return {
      ok: false,
      messageId: null,
      reason: "BREVO_DISABLED_BY_FLAG",
      status: null,
      latencyMs: Date.now() - startedAt,
    };
  }

  const fromEmail = process.env.BREVO_FROM_EMAIL?.trim();
  if (!fromEmail) {
    return {
      ok: false,
      messageId: null,
      reason: "BREVO_FROM_EMAIL_MISSING",
      status: null,
      latencyMs: Date.now() - startedAt,
    };
  }
  const fromName = process.env.BREVO_FROM_NAME?.trim() || "AuditProfiles";

  const res = await brevoFetch("/v3/smtp/email", {
    method: "POST",
    body: {
      sender: { email: fromEmail, name: fromName },
      to: [{ email: input.to }],
      subject: input.subject,
      htmlContent: input.html,
      textContent: input.text,
    },
  });

  if (!res.ok) {
    return {
      ok: false,
      messageId: null,
      reason: res.reason,
      status: res.status ?? null,
      latencyMs: Date.now() - startedAt,
    };
  }

  let messageId: string | null = null;
  if (res.bodyText) {
    try {
      const json = JSON.parse(res.bodyText) as { messageId?: string };
      messageId = typeof json?.messageId === "string" ? json.messageId : null;
    } catch {
      // success even if body unparseable
    }
  }
  return {
    ok: true,
    messageId,
    reason: null,
    status: res.status,
    latencyMs: Date.now() - startedAt,
  };
}

async function sendViaResend(
  input: SendTransactionalEmailInput,
): Promise<ProviderResult> {
  const startedAt = Date.now();

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return {
      ok: false,
      messageId: null,
      reason: "RESEND_API_KEY_MISSING",
      status: null,
      latencyMs: Date.now() - startedAt,
    };
  }

  const sender = resolveSender();
  if (!sender.ok) {
    return {
      ok: false,
      messageId: null,
      reason: sender.reason,
      status: null,
      latencyMs: Date.now() - startedAt,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: sender.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      let excerpt = "";
      try {
        excerpt = (await res.text()).slice(0, 200);
      } catch {
        // ignore
      }
      return {
        ok: false,
        messageId: null,
        reason: `RESEND_${res.status}:${excerpt}`,
        status: res.status,
        latencyMs: Date.now() - startedAt,
      };
    }

    let messageId: string | null = null;
    try {
      const json = (await res.json()) as { id?: string };
      messageId = json?.id ?? null;
    } catch {
      // ignore
    }
    return {
      ok: true,
      messageId,
      reason: null,
      status: res.status,
      latencyMs: Date.now() - startedAt,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        messageId: null,
        reason: "RESEND_TIMEOUT",
        status: null,
        latencyMs: Date.now() - startedAt,
      };
    }
    return {
      ok: false,
      messageId: null,
      reason: `RESEND_NETWORK:${err instanceof Error ? err.message : "unknown"}`,
      status: null,
      latencyMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
): Promise<SendTransactionalEmailResult> {
  const startedAt = Date.now();

  // 1. Try Brevo first.
  const brevo = await sendViaBrevo(input);

  if (brevo.ok) {
    await safeRecord("brevo_email_sent", input, {
      message_id: brevo.messageId,
      status: brevo.status,
      latency_ms: brevo.latencyMs,
    });
    return {
      ok: true,
      provider: "brevo",
      messageId: brevo.messageId,
      latencyMs: Date.now() - startedAt,
    };
  }

  // Brevo failed — log and decide on fallback.
  await safeRecord("brevo_email_failed", input, {
    reason: brevo.reason,
    status: brevo.status,
    latency_ms: brevo.latencyMs,
  });

  const resendApiKeyOk = Boolean(process.env.RESEND_API_KEY?.trim());
  const resendFromOk = Boolean(process.env.RESEND_FROM?.trim());
  // Kill switch: RESEND_FALLBACK_ENABLED. Default ON; set to literal "false"
  // to disable the Resend fallback (Brevo failures will not be retried).
  const resendFallbackEnabled =
    (process.env.RESEND_FALLBACK_ENABLED ?? "true").trim().toLowerCase() !== "false";
  const resendConfigured = resendApiKeyOk && resendFromOk && resendFallbackEnabled;
  if (!resendConfigured) {
    const missingSecret = !resendFallbackEnabled
      ? "RESEND_FALLBACK_ENABLED"
      : !resendApiKeyOk
        ? "RESEND_API_KEY"
        : "RESEND_FROM";
    const resendReason = !resendFallbackEnabled
      ? "RESEND_DISABLED_BY_FLAG"
      : !resendApiKeyOk
        ? "RESEND_API_KEY_MISSING"
        : "RESEND_FROM_MISSING";
    await safeRecord(FLOW_FAILURE_EVENT[input.flowType], input, {
      brevo_reason: brevo.reason,
      resend_reason: resendReason,
      fallback_attempted: false,
      missing_secret: missingSecret,
      provider: "resend",
    });
    return {
      ok: false,
      brevoReason: brevo.reason ?? "BREVO_UNKNOWN",
      resendReason,
      latencyMs: Date.now() - startedAt,
    };
  }

  // 2. Resend fallback.
  const resend = await sendViaResend(input);

  if (resend.ok) {
    await safeRecord("resend_fallback_email_sent", input, {
      message_id: resend.messageId,
      status: resend.status,
      latency_ms: resend.latencyMs,
      brevo_reason: brevo.reason,
    });
    return {
      ok: true,
      provider: "resend",
      messageId: resend.messageId,
      latencyMs: Date.now() - startedAt,
      brevoFailed: { reason: brevo.reason ?? "BREVO_UNKNOWN" },
    };
  }

  // Total failure.
  await safeRecord(FLOW_FAILURE_EVENT[input.flowType], input, {
    brevo_reason: brevo.reason,
    resend_reason: resend.reason,
    fallback_attempted: true,
  });
  return {
    ok: false,
    brevoReason: brevo.reason ?? "BREVO_UNKNOWN",
    resendReason: resend.reason,
    latencyMs: Date.now() - startedAt,
  };
}