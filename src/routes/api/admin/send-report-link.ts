/**
 * POST /api/admin/send-report-link
 *
 * Admin-only action: sends the PUBLIC report link (/analyze/:handle) by
 * email to the lead. On success, records `report_link_sent` and moves the
 * commercial_status to `link_enviado`. On failure, status is NOT touched.
 *
 * Distinct from /api/send-report-email which sends the PDF signed URL.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import {
  recordLeadEvent,
  updateLeadCommercialStatus,
} from "@/lib/admin/lead-events.server";
import { renderReportReady } from "@/lib/email/templates";
import { renderWithOverride } from "@/lib/email/template-overrides.server";
import { maybeAdvanceLeadStatus } from "@/lib/admin/lead-lifecycle";
import { resolveSender } from "@/lib/email/sender";

const RequestSchema = z.object({
  lead_id: z.string().uuid(),
  report_request_id: z.string().uuid(),
});

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const RESEND_TIMEOUT_MS = 10_000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const READY_STATUSES = new Set([
  "completed",
  "ready",
  "generated",
  "approved",
]);

type ErrorCode =
  | "INVALID_PAYLOAD"
  | "UNAUTHORIZED"
  | "EMAIL_PROVIDER_NOT_CONFIGURED"
  | "LEAD_NOT_FOUND"
  | "REQUEST_NOT_FOUND"
  | "REPORT_NOT_READY"
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

function errorResponseWithDetails(
  code: ErrorCode,
  message: string,
  details: string | null,
  status = 400,
): Response {
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

export const Route = createFileRoute("/api/admin/send-report-link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Admin auth (helper throws a Response on failure)
        try {
          await requireAdminSession();
        } catch (err) {
          if (err instanceof Response) return err;
          return errorResponse("UNAUTHORIZED", "Admin session required.", 401);
        }

        // 2. Payload
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

        // 3. Provider configured?
        const resendApiKey = process.env.RESEND_API_KEY;
        if (!resendApiKey) {
          return errorResponse(
            "EMAIL_PROVIDER_NOT_CONFIGURED",
            "RESEND_API_KEY is not configured.",
            500,
          );
        }

        // 4. Load report_request
        const { data: reportRequest, error: rrErr } = await supabaseAdmin
          .from("report_requests")
          .select(
            "id, lead_id, instagram_username, request_status, analysis_snapshot_id",
          )
          .eq("id", payload.report_request_id)
          .maybeSingle();

        if (rrErr) {
          return errorResponse(
            "PERSISTENCE_FAILED",
            `Failed to load report request: ${rrErr.message}`,
            500,
          );
        }
        if (!reportRequest || reportRequest.lead_id !== payload.lead_id) {
          return errorResponse(
            "REQUEST_NOT_FOUND",
            "Report request does not exist for this lead.",
            404,
          );
        }

        if (
          !READY_STATUSES.has(reportRequest.request_status) ||
          !reportRequest.analysis_snapshot_id
        ) {
          return errorResponse(
            "REPORT_NOT_READY",
            `Report is not ready (status: ${reportRequest.request_status}).`,
            409,
          );
        }

        if (!reportRequest.instagram_username) {
          return errorResponse(
            "HANDLE_MISSING",
            "Report request has no Instagram handle.",
            422,
          );
        }

        // 5. Load lead
        const { data: lead, error: leadErr } = await supabaseAdmin
          .from("leads")
          .select("id, email, email_normalized, name")
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
          return errorResponse(
            "LEAD_EMAIL_MISSING",
            "Lead has no email address.",
            422,
          );
        }

        const recipientEmail = lead.email.trim();
        if (!EMAIL_REGEX.test(recipientEmail)) {
          return errorResponse(
            "LEAD_EMAIL_INVALID",
            "Lead email is malformed.",
            422,
          );
        }

        // 6. Build public URL
        const baseUrl = resolvePublicBaseUrl(request);
        if (!baseUrl) {
          return errorResponse(
            "PERSISTENCE_FAILED",
            "Could not determine public base URL.",
            500,
          );
        }
        const publicUrl = `${baseUrl}/analyze/${encodeURIComponent(reportRequest.instagram_username)}`;

        // 7. Build email (uses unified pt-PT templates module)
        const firstName = lead.name?.trim().split(/\s+/)[0] ?? null;
        const { subject, html, text } = await renderWithOverride(
          "report_ready",
          {
            firstName: firstName ?? "",
            instagramHandle: reportRequest.instagram_username,
            reportUrl: publicUrl,
          },
          () =>
            renderReportReady({
              firstName,
              instagramHandle: reportRequest.instagram_username,
              reportUrl: publicUrl,
            }),
        );

        // 8. Send via Resend
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          RESEND_TIMEOUT_MS,
        );
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
          let providerMessage: string | null = null;
          try {
            const parsed = JSON.parse(bodyText) as {
              message?: string;
              error?: { message?: string } | string;
              name?: string;
            };
            const errField =
              typeof parsed.error === "string"
                ? parsed.error
                : parsed.error?.message;
            providerMessage = parsed.message ?? errField ?? null;
          } catch {
            providerMessage = bodyText ? bodyText.slice(0, 200) : null;
          }
          const matchSource = providerMessage ?? bodyText;
          const isSandboxBlock =
            /(testing emails|only send.*verified|verified (email|domain))/i.test(
              matchSource,
            );
          const truncated = providerMessage
            ? providerMessage.slice(0, 200)
            : null;
          if (isSandboxBlock) {
            return errorResponseWithDetails(
              "RESEND_SANDBOX_RECIPIENT_BLOCKED",
              "Sandbox sender can only deliver to verified recipients.",
              truncated,
              502,
            );
          }
          return errorResponseWithDetails(
            "RESEND_FAILED",
            `Email provider returned ${resendResponse.status}.`,
            truncated,
            502,
          );
        }

        const resendData = (await resendResponse.json().catch(() => ({}))) as {
          id?: string;
        };
        const messageId = resendData.id ?? null;
        const sentAt = new Date().toISOString();

        // 9. Record event (success path only)
        try {
          await recordLeadEvent({
            leadId: lead.id,
            eventType: "report_link_sent",
            snapshotId: reportRequest.analysis_snapshot_id,
            handle: reportRequest.instagram_username,
            metadata: {
              report_request_id: reportRequest.id,
              message_id: messageId,
              channel: "admin_manual",
              recipient: lead.email_normalized ?? recipientEmail,
              public_url: publicUrl,
            },
          });
        } catch {
          /* non-critical */
        }

        // 10. Update commercial_status (only after successful send).
        // Never regress: if the lead is already past `link_enviado` in the
        // funnel (e.g. `relatorio_visto`, `feedback_pedido`), preserve it.
        const { data: leadStatusRow } = await supabaseAdmin
          .from("leads")
          .select("commercial_status")
          .eq("id", lead.id)
          .maybeSingle();
        const currentStatus =
          (leadStatusRow?.commercial_status as string | null) ?? null;
        const advanceTo = maybeAdvanceLeadStatus(currentStatus, "link_enviado");
        let statusResult: { changed: boolean; previous: string | null } = {
          changed: false,
          previous: currentStatus,
        };
        if (advanceTo) {
          const r = await updateLeadCommercialStatus({
            leadId: lead.id,
            status: advanceTo,
            source: "manual",
            reason: "Admin sent public report link",
          });
          statusResult = { changed: r.changed, previous: r.previous };
        }

        return jsonResponse(
          {
            success: true,
            message_id: messageId,
            sent_at: sentAt,
            public_url: publicUrl,
            status_changed: statusResult.changed,
            previous_status: statusResult.previous,
          },
          200,
        );
      },
    },
  },
});