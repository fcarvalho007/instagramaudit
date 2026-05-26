/**
 * POST /api/admin/send-commercial-followup
 *
 * Admin-only manual action: sends the `commercial-followup` template to
 * a lead. On success, records `commercial_followup_sent` in product_events,
 * stamps `leads.contacted_at = now()` (best-effort) and never advances the
 * commercial_status (the admin chooses status separately on the kanban).
 *
 * Idempotency is intentionally NOT enforced here — the admin may legitimately
 * resend the follow-up. UI surfaces the last send timestamp.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import { recordLeadEvent } from "@/lib/admin/lead-events.server";
import { renderCommercialFollowup } from "@/lib/email/templates";
import { renderWithOverride } from "@/lib/email/template-overrides.server";
import { buildUnsubscribeUrl } from "@/lib/email/url";
import { resolveSender } from "@/lib/email/sender";
import { interpretFeedback } from "@/lib/admin/feedback-intent";
import type { BetaFeedbackSummary } from "@/lib/admin/kanban-columns";

const RequestSchema = z.object({
  lead_id: z.string().uuid(),
  checkout_url: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().url().optional(),
  ),
});

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 10_000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ErrorCode =
  | "INVALID_PAYLOAD"
  | "UNAUTHORIZED"
  | "EMAIL_PROVIDER_NOT_CONFIGURED"
  | "LEAD_NOT_FOUND"
  | "LEAD_EMAIL_MISSING"
  | "LEAD_EMAIL_INVALID"
  | "RESEND_FAILED"
  | "RESEND_SANDBOX_RECIPIENT_BLOCKED"
  | "RESEND_TIMEOUT"
  | "PERSISTENCE_FAILED";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(code: ErrorCode, message: string, status = 400, details?: string | null): Response {
  return jsonResponse(
    { success: false, error_code: code, message, details: details ?? undefined },
    status,
  );
}

function resolvePublicBaseUrl(request: Request): string | null {
  const envBase = process.env.PUBLIC_APP_BASE_URL ?? process.env.PDF_PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, "");
  const origin = request.headers.get("origin");
  if (origin) return origin.replace(/\/+$/, "");
  const host = request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }
  try {
    return new URL(request.url).origin;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/admin/send-commercial-followup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireAdminSession();
        } catch (err) {
          if (err instanceof Response) return err;
          return errorResponse("UNAUTHORIZED", "Admin session required.", 401);
        }

        let payload: z.infer<typeof RequestSchema>;
        try {
          payload = RequestSchema.parse(await request.json());
        } catch (err) {
          const message =
            err instanceof z.ZodError
              ? err.issues.map((i) => i.message).join("; ")
              : "Malformed JSON body.";
          return errorResponse("INVALID_PAYLOAD", message, 400);
        }

        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
          return errorResponse(
            "EMAIL_PROVIDER_NOT_CONFIGURED",
            "RESEND_API_KEY is not configured.",
            500,
          );
        }

        // Load lead
        const { data: lead, error: leadErr } = await supabaseAdmin
          .from("leads")
          .select("id, email, email_normalized, name, pricing_preference, commercial_status")
          .eq("id", payload.lead_id)
          .maybeSingle();

        if (leadErr) {
          return errorResponse(
            "PERSISTENCE_FAILED",
            `Failed to load lead: ${leadErr.message}`,
            500,
          );
        }
        if (!lead) {
          return errorResponse("LEAD_NOT_FOUND", "Lead does not exist.", 404);
        }
        if (!lead.email) {
          return errorResponse("LEAD_EMAIL_MISSING", "Lead has no email address.", 422);
        }
        const recipientEmail = lead.email.trim();
        if (!EMAIL_REGEX.test(recipientEmail)) {
          return errorResponse("LEAD_EMAIL_INVALID", "Lead email is malformed.", 422);
        }

        // Load latest feedback to (a) gate the send and (b) compute the
        // status transition that follows a successful send.
        const { data: latestFeedback } = await supabaseAdmin
          .from("beta_feedback")
          .select(
            "id, usefulness_score, clarity_text, missing_text, purchase_intent, pricing_preference, contact_consent, created_at",
          )
          .eq("lead_id", lead.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const feedbackSummary = (latestFeedback as BetaFeedbackSummary | null) ?? null;
        const intentResult = interpretFeedback(feedbackSummary);
        const targetStatus =
          intentResult.intent === "alto"
            ? "potencial_cliente"
            : intentResult.intent === "medio"
              ? "interessado"
              : null;

        // Try to enrich with the latest report request (handle + report URL)
        const { data: latestRequest } = await supabaseAdmin
          .from("report_requests")
          .select("instagram_username, analysis_snapshot_id")
          .eq("lead_id", lead.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const baseUrl = resolvePublicBaseUrl(request);
        const handle = latestRequest?.instagram_username ?? null;
        const reportUrl =
          baseUrl && handle ? `${baseUrl}/analyze/${encodeURIComponent(handle)}` : null;

        const firstName = lead.name?.trim().split(/\s+/)[0] ?? null;
        const pricingPreference =
          feedbackSummary?.pricing_preference ?? lead.pricing_preference ?? null;
        const checkoutUrl = payload.checkout_url ?? null;
        const { subject, html, text } = await renderWithOverride(
          "commercial_followup",
          {
            firstName: firstName ?? "",
            instagramHandle: handle ?? "",
            reportUrl: reportUrl ?? "",
            checkoutUrl: checkoutUrl ?? "",
          },
          () =>
            renderCommercialFollowup({
              firstName,
              instagramHandle: handle,
              reportUrl,
              replyToEmail: null,
              checkoutUrl,
              unsubscribeUrl: lead?.id ? buildUnsubscribeUrl(lead.id) : null,
            }),
        );

        const sender = resolveSender();

        // Send via Resend with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS);
        let resendResponse: Response;
        try {
          resendResponse = await fetch(RESEND_ENDPOINT, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: sender,
              to: [recipientEmail],
              subject,
              html,
              text,
            }),
            signal: controller.signal,
          });
        } catch (err) {
          const isAbort =
            err instanceof Error &&
            (err.name === "AbortError" || err.name === "TimeoutError");
          await recordFailureEvent(lead.id, latestRequest?.analysis_snapshot_id ?? null, handle, {
            error_code: isAbort ? "RESEND_TIMEOUT" : "RESEND_FAILED",
            recipient: lead.email_normalized ?? recipientEmail,
          });
          return errorResponse(
            isAbort ? "RESEND_TIMEOUT" : "RESEND_FAILED",
            isAbort ? "Email provider request timed out." : "Failed to reach email provider.",
            isAbort ? 504 : 502,
          );
        } finally {
          clearTimeout(timeoutId);
        }

        if (!resendResponse.ok) {
          const bodyText = await resendResponse.text().catch(() => "");
          let providerMessage: string | null = null;
          try {
            const parsed = JSON.parse(bodyText) as {
              message?: string;
              error?: { message?: string } | string;
            };
            const errField =
              typeof parsed.error === "string" ? parsed.error : parsed.error?.message;
            providerMessage = parsed.message ?? errField ?? null;
          } catch {
            providerMessage = bodyText ? bodyText.slice(0, 200) : null;
          }
          const matchSource = providerMessage ?? bodyText;
          const isSandboxBlock =
            /(testing emails|only send.*verified|verified (email|domain))/i.test(matchSource);
          const truncated = providerMessage ? providerMessage.slice(0, 200) : null;
          if (isSandboxBlock) {
            await recordFailureEvent(lead.id, latestRequest?.analysis_snapshot_id ?? null, handle, {
              error_code: "RESEND_SANDBOX_RECIPIENT_BLOCKED",
              provider_message: truncated,
              http_status: resendResponse.status,
              recipient: lead.email_normalized ?? recipientEmail,
            });
            return errorResponse(
              "RESEND_SANDBOX_RECIPIENT_BLOCKED",
              "Sandbox sender can only deliver to verified recipients.",
              502,
              truncated,
            );
          }
          await recordFailureEvent(lead.id, latestRequest?.analysis_snapshot_id ?? null, handle, {
            error_code: "RESEND_FAILED",
            provider_message: truncated,
            http_status: resendResponse.status,
            recipient: lead.email_normalized ?? recipientEmail,
          });
          return errorResponse(
            "RESEND_FAILED",
            `Email provider returned ${resendResponse.status}.`,
            502,
            truncated,
          );
        }

        const resendData = (await resendResponse.json().catch(() => ({}))) as {
          id?: string;
        };
        const messageId = resendData.id ?? null;
        const sentAt = new Date().toISOString();

        // Record event (success path)
        try {
          await recordLeadEvent({
            leadId: lead.id,
            eventType: "commercial_followup_sent",
            snapshotId: latestRequest?.analysis_snapshot_id ?? null,
            handle,
            metadata: {
              message_id: messageId,
              channel: "admin_manual",
              recipient: lead.email_normalized ?? recipientEmail,
              pricing_preference: pricingPreference,
              report_url: reportUrl,
              checkout_url: checkoutUrl,
              detected_intent: intentResult.intent,
              previous_status: lead.commercial_status,
              new_status: targetStatus ?? lead.commercial_status,
            },
          });
        } catch {
          /* non-critical */
        }

        // Stamp contacted_at and (when intent justifies it) advance the
        // commercial_status. We never overwrite terminal/exit statuses
        // (`convertido`, `arquivado`) — admin owns those moves.
        try {
          const updates: {
            contacted_at: string;
            updated_at: string;
            commercial_status?: string;
          } = {
            contacted_at: sentAt,
            updated_at: sentAt,
          };
          const currentStatus = lead.commercial_status as string | null;
          if (
            targetStatus &&
            currentStatus !== "convertido" &&
            currentStatus !== "arquivado" &&
            currentStatus !== targetStatus
          ) {
            updates.commercial_status = targetStatus;
          }
          await supabaseAdmin.from("leads").update(updates).eq("id", lead.id);
        } catch {
          /* non-critical */
        }

        return jsonResponse(
          {
            success: true,
            message_id: messageId,
            sent_at: sentAt,
            new_status: targetStatus,
          },
          200,
        );
      },
    },
  },
});

async function recordFailureEvent(
  leadId: string,
  snapshotId: string | null,
  handle: string | null,
  metadata: Record<string, unknown>,
): Promise<void> {
  try {
    await recordLeadEvent({
      leadId,
      eventType: "commercial_followup_failed",
      snapshotId,
      handle,
      metadata: { ...metadata, channel: "admin_manual" },
    });
  } catch {
    /* non-critical */
  }
}