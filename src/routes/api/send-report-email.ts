/**
 * POST /api/send-report-email
 *
 * Sends the generated report PDF by email via Resend.
 *
 * Pure orchestration: snapshot/PDF are NEVER regenerated here. The route
 * resolves report_request_id → row → linked lead → signed URL of the
 * already-stored PDF → Resend send → updates delivery tracking.
 *
 * Re-send is always allowed (idempotency v1): each call overwrites
 * `email_sent_at` + `email_message_id` and emits a fresh signed URL.
 *
 * Sender uses Resend's sandbox identity (`onboarding@resend.dev`) until a
 * verified domain is configured for the project.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { REPORT_PDF_BUCKET } from "@/lib/pdf/storage";
import {
  buildReportEmailHtml,
  buildReportEmailSubject,
  buildReportEmailText,
} from "@/lib/email/report-email-template";

const RequestSchema = z.object({
  report_request_id: z.string().uuid(),
});

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const SENDER_FROM = "InstaBench <onboarding@resend.dev>";
const RESEND_ENDPOINT = "https://api.resend.com/emails";

type ErrorCode =
  | "INVALID_PAYLOAD"
  | "UNAUTHORIZED"
  | "EMAIL_PROVIDER_NOT_CONFIGURED"
  | "REQUEST_NOT_FOUND"
  | "PDF_NOT_READY"
  | "LEAD_EMAIL_MISSING"
  | "LEAD_EMAIL_INVALID"
  | "DELIVERY_IN_PROGRESS"
  | "SIGNED_URL_FAILED"
  | "RESEND_FAILED"
  | "RESEND_SANDBOX_RECIPIENT_BLOCKED"
  | "RESEND_TIMEOUT"
  | "PERSISTENCE_FAILED";

const RESEND_TIMEOUT_MS = 10_000;
// Basic RFC 5322-lite check; intentionally permissive but rejects whitespace.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(
  code: ErrorCode,
  message: string,
  status = 400,
): Response {
  return jsonResponse({ success: false, error_code: code, message }, status);
}

async function markFailed(
  reportRequestId: string,
  internalMessage: string,
): Promise<void> {
  await supabaseAdmin
    .from("report_requests")
    .update({
      delivery_status: "failed",
      email_error_message: internalMessage.slice(0, 500),
    })
    .eq("id", reportRequestId);
}

export const Route = createFileRoute("/api/send-report-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Parse + validate payload
        let payload: { report_request_id: string };
        try {
          const raw = await request.json();
          payload = RequestSchema.parse(raw);
        } catch (err) {
          const message =
            err instanceof z.ZodError
              ? err.issues.map((i) => i.message).join("; ")
              : "Malformed JSON body.";
          return errorResponse("INVALID_PAYLOAD", message, 400);
        }

        // 2. Provider configured?
        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
          return errorResponse(
            "EMAIL_PROVIDER_NOT_CONFIGURED",
            "RESEND_API_KEY is not configured.",
            500,
          );
        }

        // 3. Fetch report request
        const { data: reportRequest, error: requestError } = await supabaseAdmin
          .from("report_requests")
          .select(
            "id, lead_id, instagram_username, pdf_status, pdf_storage_path, delivery_status",
          )
          .eq("id", payload.report_request_id)
          .maybeSingle();

        if (requestError) {
          return errorResponse(
            "PERSISTENCE_FAILED",
            `Failed to load report request: ${requestError.message}`,
            500,
          );
        }
        if (!reportRequest) {
          return errorResponse(
            "REQUEST_NOT_FOUND",
            "Report request does not exist.",
            404,
          );
        }

        // 4. PDF readiness
        if (
          reportRequest.pdf_status !== "ready" ||
          !reportRequest.pdf_storage_path
        ) {
          return errorResponse(
            "PDF_NOT_READY",
            `PDF is not ready (status: ${reportRequest.pdf_status}).`,
            409,
          );
        }

        // 5. Resolve lead
        const { data: lead, error: leadError } = await supabaseAdmin
          .from("leads")
          .select("email, name")
          .eq("id", reportRequest.lead_id)
          .maybeSingle();

        if (leadError) {
          return errorResponse(
            "PERSISTENCE_FAILED",
            `Failed to load lead: ${leadError.message}`,
            500,
          );
        }
        if (!lead || !lead.email) {
          await markFailed(reportRequest.id, "Lead email is missing.");
          return errorResponse(
            "LEAD_EMAIL_MISSING",
            "Linked lead has no email address.",
            422,
          );
        }

        // 6. Mark sending
        await supabaseAdmin
          .from("report_requests")
          .update({
            delivery_status: "sending",
            email_error_message: null,
          })
          .eq("id", reportRequest.id);

        // 7. Generate signed URL (7 days)
        const { data: signed, error: signError } = await supabaseAdmin.storage
          .from(REPORT_PDF_BUCKET)
          .createSignedUrl(
            reportRequest.pdf_storage_path,
            SIGNED_URL_TTL_SECONDS,
          );

        if (signError || !signed?.signedUrl) {
          const msg = signError?.message ?? "Signed URL is empty.";
          await markFailed(reportRequest.id, `Signed URL failure: ${msg}`);
          return errorResponse("SIGNED_URL_FAILED", msg, 500);
        }

        // 8. Build email content
        const emailParams = {
          recipientName: lead.name ?? null,
          instagramUsername: reportRequest.instagram_username,
          signedUrl: signed.signedUrl,
        };
        const subject = buildReportEmailSubject(
          reportRequest.instagram_username,
        );
        const html = buildReportEmailHtml(emailParams);
        const text = buildReportEmailText(emailParams);

        // 9. Send via Resend
        let resendResponse: Response;
        try {
          resendResponse = await fetch(RESEND_ENDPOINT, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: SENDER_FROM,
              to: [lead.email],
              subject,
              html,
              text,
            }),
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Network error.";
          await markFailed(reportRequest.id, `Resend network error: ${msg}`);
          return errorResponse(
            "RESEND_FAILED",
            "Failed to reach email provider.",
            502,
          );
        }

        if (!resendResponse.ok) {
          const bodyText = await resendResponse.text().catch(() => "");
          await markFailed(
            reportRequest.id,
            `Resend ${resendResponse.status}: ${bodyText.slice(0, 300)}`,
          );
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

        // 10. Persist success
        const sentAt = new Date().toISOString();
        const { error: updateError } = await supabaseAdmin
          .from("report_requests")
          .update({
            delivery_status: "sent",
            email_sent_at: sentAt,
            email_message_id: messageId,
            email_error_message: null,
          })
          .eq("id", reportRequest.id);

        if (updateError) {
          // Email was sent but persistence failed — surface internally.
          return errorResponse(
            "PERSISTENCE_FAILED",
            `Email sent but failed to update tracking: ${updateError.message}`,
            500,
          );
        }

        return jsonResponse(
          {
            success: true,
            report_request_id: reportRequest.id,
            delivery_status: "sent",
            email_sent_at: sentAt,
            email_message_id: messageId,
            message: "Report email sent.",
          },
          200,
        );
      },
    },
  },
});
