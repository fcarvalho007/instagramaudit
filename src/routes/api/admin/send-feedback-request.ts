/**
 * POST /api/admin/send-feedback-request
 *
 * Admin-only action: sends the public feedback link
 * (`/feedback/:report_request_id`) by email to the lead. On success records
 * `feedback_requested` and moves commercial_status to `feedback_pedido`.
 * On failure, status is NOT touched.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import {
  recordLeadEvent,
  updateLeadCommercialStatus,
} from "@/lib/admin/lead-events.server";
import { renderFeedbackRequest } from "@/lib/email/templates";
import { renderWithOverride } from "@/lib/email/template-overrides.server";
import { buildUnsubscribeUrl } from "@/lib/email/url";
import { resolveSender } from "@/lib/email/sender";

const RequestSchema = z.object({
  lead_id: z.string().uuid(),
  report_request_id: z.string().uuid(),
});

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 10_000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Lead must already have received the link (or have it visible) before we ask
// for feedback. We allow re-sending while still in feedback_pedido as a manual
// nudge, but block once feedback was actually received or the lead is archived.
const ELIGIBLE_STATUSES = new Set([
  "link_enviado",
  "relatorio_visto",
  "feedback_pedido",
]);

type ErrorCode =
  | "INVALID_PAYLOAD"
  | "UNAUTHORIZED"
  | "EMAIL_PROVIDER_NOT_CONFIGURED"
  | "LEAD_NOT_FOUND"
  | "REQUEST_NOT_FOUND"
  | "STATUS_NOT_ELIGIBLE"
  | "LEAD_EMAIL_MISSING"
  | "LEAD_EMAIL_INVALID"
  | "HANDLE_MISSING"
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
function errorResponse(code: ErrorCode, message: string, status = 400): Response {
  return jsonResponse({ success: false, error_code: code, message }, status);
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

export const Route = createFileRoute("/api/admin/send-feedback-request")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireAdminSession();
        } catch (err) {
          if (err instanceof Response) return err;
          return errorResponse("UNAUTHORIZED", "Admin session required.", 401);
        }

        let payload: { lead_id: string; report_request_id: string };
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

        // Load report_request
        const { data: rr, error: rrErr } = await supabaseAdmin
          .from("report_requests")
          .select("id, lead_id, instagram_username, analysis_snapshot_id")
          .eq("id", payload.report_request_id)
          .maybeSingle();
        if (rrErr) {
          return errorResponse(
            "PERSISTENCE_FAILED",
            `Failed to load report request: ${rrErr.message}`,
            500,
          );
        }
        if (!rr || rr.lead_id !== payload.lead_id) {
          return errorResponse(
            "REQUEST_NOT_FOUND",
            "Report request does not exist for this lead.",
            404,
          );
        }
        if (!rr.instagram_username) {
          return errorResponse("HANDLE_MISSING", "Handle Instagram em falta.", 422);
        }

        // Load lead
        const { data: lead, error: leadErr } = await supabaseAdmin
          .from("leads")
          .select("id, email, email_normalized, name, commercial_status")
          .eq("id", payload.lead_id)
          .maybeSingle();
        if (leadErr) {
          return errorResponse(
            "PERSISTENCE_FAILED",
            `Failed to load lead: ${leadErr.message}`,
            500,
          );
        }
        if (!lead) return errorResponse("LEAD_NOT_FOUND", "Lead does not exist.", 404);
        if (!lead.email)
          return errorResponse("LEAD_EMAIL_MISSING", "Lead has no email.", 422);

        const recipientEmail = lead.email.trim();
        if (!EMAIL_REGEX.test(recipientEmail)) {
          return errorResponse("LEAD_EMAIL_INVALID", "Lead email is malformed.", 422);
        }

        if (!ELIGIBLE_STATUSES.has(lead.commercial_status ?? "")) {
          return errorResponse(
            "STATUS_NOT_ELIGIBLE",
            `Status atual (${lead.commercial_status}) não permite pedir feedback.`,
            409,
          );
        }

        // Build URLs
        const baseUrl = resolvePublicBaseUrl(request);
        if (!baseUrl) {
          return errorResponse(
            "PERSISTENCE_FAILED",
            "Could not determine public base URL.",
            500,
          );
        }
        const feedbackUrl = `${baseUrl}/feedback/${rr.id}`;
        const reportUrl = `${baseUrl}/analyze/${encodeURIComponent(rr.instagram_username)}`;

        const firstName = lead.name?.trim().split(/\s+/)[0] ?? null;
        const { subject, html, text } = await renderWithOverride(
          "feedback_request",
          {
            firstName: firstName ?? "",
            instagramHandle: rr.instagram_username,
            reportUrl,
            feedbackUrl,
          },
          () =>
            renderFeedbackRequest({
              firstName,
              instagramHandle: rr.instagram_username,
              reportUrl,
              feedbackUrl,
              unsubscribeUrl: lead?.id ? buildUnsubscribeUrl(lead.id) : null,
            }),
        );

        // Send via Resend
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
              from: resolveSender(),
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
          return errorResponse(
            isAbort ? "RESEND_TIMEOUT" : "RESEND_FAILED",
            isAbort
              ? "Email provider request timed out."
              : "Failed to reach email provider.",
            isAbort ? 504 : 502,
          );
        } finally {
          clearTimeout(timeoutId);
        }

        if (!resendResponse.ok) {
          const bodyText = await resendResponse.text().catch(() => "");
          const isSandboxBlock =
            /you can only send testing emails to your own email/i.test(bodyText);
          if (isSandboxBlock) {
            return errorResponse(
              "RESEND_SANDBOX_RECIPIENT_BLOCKED",
              "Sandbox sender can only deliver to the Resend account owner.",
              502,
            );
          }
          return errorResponse(
            "RESEND_FAILED",
            `Email provider returned ${resendResponse.status}.`,
            502,
          );
        }

        const resendData = (await resendResponse.json().catch(() => ({}))) as {
          id?: string;
        };
        const messageId = resendData.id ?? null;
        const sentAt = new Date().toISOString();

        try {
          await recordLeadEvent({
            leadId: lead.id,
            eventType: "feedback_requested",
            snapshotId: rr.analysis_snapshot_id ?? null,
            handle: rr.instagram_username,
            metadata: {
              report_request_id: rr.id,
              message_id: messageId,
              channel: "admin_manual",
              recipient: lead.email_normalized ?? recipientEmail,
              feedback_url: feedbackUrl,
            },
          });
        } catch {
          /* non-critical */
        }

        const statusResult = await updateLeadCommercialStatus({
          leadId: lead.id,
          status: "feedback_pedido",
          source: "manual",
          reason: "Admin sent feedback request",
        });

        return jsonResponse(
          {
            success: true,
            message_id: messageId,
            sent_at: sentAt,
            feedback_url: feedbackUrl,
            status_changed: statusResult.changed,
            previous_status: statusResult.previous,
          },
          200,
        );
      },
    },
  },
});