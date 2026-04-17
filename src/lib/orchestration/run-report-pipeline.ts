/**
 * Server-side orchestrator for the full report lifecycle.
 *
 * Triggered immediately after a `report_requests` row is inserted by
 * `/api/request-full-report`. Runs in the background (fire-and-forget) so the
 * client receives an HTTP response without waiting for PDF generation or email
 * delivery.
 *
 * Lifecycle (`request_status`):
 *   pending → processing → completed
 *                       → failed_pdf
 *                       → failed_email
 *
 * Reuses existing internal HTTP routes (`/api/generate-report-pdf`,
 * `/api/send-report-email`) — no logic duplication. PDF generation and email
 * delivery already implement their own idempotency / locking; the orchestrator
 * only manages the aggregate state transitions.
 *
 * Idempotency: if the request is already `processing` or `completed`, the
 * helper short-circuits silently. Designed to tolerate future admin-triggered
 * re-runs without rebuilding work.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

type RequestStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed_pdf"
  | "failed_email";

const LOG_PREFIX = "[orchestrate]";

async function setRequestStatus(
  reportRequestId: string,
  status: RequestStatus,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("report_requests")
    .update({ request_status: status })
    .eq("id", reportRequestId);

  if (error) {
    console.error(
      `${LOG_PREFIX} failed to set request_status='${status}' on ${reportRequestId}:`,
      error.message,
    );
  }
}

async function callPdfRoute(
  origin: string,
  reportRequestId: string,
): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${origin}/api/generate-report-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_request_id: reportRequestId }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, detail: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true, detail: "PDF route succeeded." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return { ok: false, detail: `Network error: ${msg}` };
  }
}

async function callEmailRoute(
  origin: string,
  reportRequestId: string,
  internalToken: string,
): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(`${origin}/api/send-report-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": internalToken,
      },
      body: JSON.stringify({ report_request_id: reportRequestId }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, detail: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true, detail: "Email route succeeded." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return { ok: false, detail: `Network error: ${msg}` };
  }
}

/**
 * Runs the full report pipeline for a freshly accepted request.
 *
 * Designed to be invoked in the background — never throws; all errors are
 * logged and reflected in `request_status`.
 */
export async function runReportPipeline(
  reportRequestId: string,
  origin: string,
): Promise<void> {
  try {
    // Idempotency guard — re-invocation on a completed or in-flight request
    // is a no-op. Future admin "re-run" paths should explicitly reset state
    // before calling this helper.
    const { data: row, error: readError } = await supabaseAdmin
      .from("report_requests")
      .select("id, request_status")
      .eq("id", reportRequestId)
      .maybeSingle();

    if (readError) {
      console.error(
        `${LOG_PREFIX} failed to read request ${reportRequestId}:`,
        readError.message,
      );
      return;
    }
    if (!row) {
      console.error(`${LOG_PREFIX} request ${reportRequestId} not found.`);
      return;
    }
    if (row.request_status === "completed") {
      console.log(
        `${LOG_PREFIX} request ${reportRequestId} already completed; skipping.`,
      );
      return;
    }
    if (row.request_status === "processing") {
      console.log(
        `${LOG_PREFIX} request ${reportRequestId} already processing; skipping.`,
      );
      return;
    }

    const internalToken = process.env.INTERNAL_API_TOKEN;
    if (!internalToken) {
      console.error(
        `${LOG_PREFIX} INTERNAL_API_TOKEN missing — cannot run pipeline for ${reportRequestId}.`,
      );
      await setRequestStatus(reportRequestId, "failed_pdf");
      return;
    }

    await setRequestStatus(reportRequestId, "processing");

    // Step 1 — generate PDF
    const pdfResult = await callPdfRoute(origin, reportRequestId);
    if (!pdfResult.ok) {
      console.error(
        `${LOG_PREFIX} PDF step failed for ${reportRequestId}: ${pdfResult.detail}`,
      );
      await setRequestStatus(reportRequestId, "failed_pdf");
      return;
    }

    // Step 2 — send email
    const emailResult = await callEmailRoute(
      origin,
      reportRequestId,
      internalToken,
    );
    if (!emailResult.ok) {
      console.error(
        `${LOG_PREFIX} email step failed for ${reportRequestId}: ${emailResult.detail}`,
      );
      await setRequestStatus(reportRequestId, "failed_email");
      return;
    }

    await setRequestStatus(reportRequestId, "completed");
    console.log(`${LOG_PREFIX} request ${reportRequestId} completed.`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error(
      `${LOG_PREFIX} unexpected error for ${reportRequestId}: ${msg}`,
    );
    // Best-effort failure marker — pdf is the most likely culprit if we got
    // here without explicit step tracking.
    await setRequestStatus(reportRequestId, "failed_pdf");
  }
}

/**
 * Fire-and-forget helper. Uses Cloudflare Workers' `waitUntil` if available
 * on the request's execution context; otherwise falls back to a detached
 * promise (acceptable for the current low-volume v1 milestone).
 */
export function runInBackground(
  promise: Promise<void>,
  ctx?: { waitUntil?: (p: Promise<unknown>) => void },
): void {
  const safe = promise.catch((err) => {
    const msg = err instanceof Error ? err.message : "unknown error";
    console.error(`${LOG_PREFIX} background task crashed: ${msg}`);
  });
  if (ctx?.waitUntil) {
    ctx.waitUntil(safe);
    return;
  }
  void safe;
}
