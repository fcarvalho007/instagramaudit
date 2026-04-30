/**
 * Generate a PDF report from a persisted report request.
 *
 * Server-only route. Resolves report_request → analysis_snapshot → PDF
 * with no provider re-fetch. Idempotent by default: when `pdf_status='ready'`
 * the existing storage reference is returned; pass `force=true` to regenerate
 * over the same path.
 *
 * Auth: NOT exposed publicly to end users yet — used by future admin/email
 * tooling. No signed URLs are returned.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isNormalizedPayload } from "@/lib/pdf/payload-guard";
import { renderViaBrowser } from "@/lib/pdf/render-via-browser.server";
import { buildSnapshotPrintUrl } from "@/lib/pdf/print-url.server";
import { buildReportPath, uploadReportPdf } from "@/lib/pdf/storage";

const PayloadSchema = z.object({
  report_request_id: z.string().uuid(),
  force: z.boolean().optional().default(false),
});

type SuccessBody = {
  success: true;
  report_request_id: string;
  pdf_status: "ready";
  pdf_storage_path: string;
  pdf_generated_at: string;
  regenerated: boolean;
};

type FailureBody = {
  success: false;
  error_code:
    | "INVALID_PAYLOAD"
    | "REQUEST_NOT_FOUND"
    | "SNAPSHOT_LINK_MISSING"
    | "SNAPSHOT_NOT_FOUND"
    | "MALFORMED_SNAPSHOT"
    | "RENDER_FAILED"
    | "UPLOAD_FAILED"
    | "PERSISTENCE_FAILED";
  message: string;
};

const json = (body: SuccessBody | FailureBody, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

async function markStatus(
  reportRequestId: string,
  patch: {
    pdf_status: string;
    pdf_storage_path?: string | null;
    pdf_generated_at?: string | null;
    pdf_error_message?: string | null;
  },
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("report_requests")
    .update(patch)
    .eq("id", reportRequestId);
  if (error) {
    console.error("[generate-report-pdf] status update failed", error);
  }
}

export const Route = createFileRoute("/api/generate-report-pdf")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),

      POST: async ({ request }) => {
        // 1) Parse + validate payload.
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json(
            {
              success: false,
              error_code: "INVALID_PAYLOAD",
              message: "Request body must be valid JSON.",
            },
            400,
          );
        }
        const parsed = PayloadSchema.safeParse(raw);
        if (!parsed.success) {
          return json(
            {
              success: false,
              error_code: "INVALID_PAYLOAD",
              message: "Invalid payload.",
            },
            400,
          );
        }

        const { report_request_id, force } = parsed.data;

        // 2) Fetch the report request row.
        const { data: reqRow, error: reqError } = await supabaseAdmin
          .from("report_requests")
          .select(
            "id, instagram_username, request_month, analysis_snapshot_id, pdf_status, pdf_storage_path, pdf_generated_at",
          )
          .eq("id", report_request_id)
          .maybeSingle();

        if (reqError) {
          console.error("[generate-report-pdf] request lookup failed", reqError);
          return json(
            {
              success: false,
              error_code: "PERSISTENCE_FAILED",
              message: "Failed to fetch report request.",
            },
            500,
          );
        }

        if (!reqRow) {
          return json(
            {
              success: false,
              error_code: "REQUEST_NOT_FOUND",
              message: "Report request not found.",
            },
            404,
          );
        }

        // 3) Idempotency — short-circuit if already generated and not forcing.
        if (
          !force &&
          reqRow.pdf_status === "ready" &&
          reqRow.pdf_storage_path &&
          reqRow.pdf_generated_at
        ) {
          return json(
            {
              success: true,
              report_request_id: reqRow.id,
              pdf_status: "ready",
              pdf_storage_path: reqRow.pdf_storage_path,
              pdf_generated_at: reqRow.pdf_generated_at,
              regenerated: false,
            },
            200,
          );
        }

        // 4) Validate snapshot link.
        if (!reqRow.analysis_snapshot_id) {
          await markStatus(reqRow.id, {
            pdf_status: "failed",
            pdf_error_message: "snapshot link missing",
          });
          return json(
            {
              success: false,
              error_code: "SNAPSHOT_LINK_MISSING",
              message: "Report request is not linked to an analysis snapshot.",
            },
            409,
          );
        }

        // 5) Fetch the linked snapshot.
        const { data: snapRow, error: snapError } = await supabaseAdmin
          .from("analysis_snapshots")
          .select("id, normalized_payload, created_at")
          .eq("id", reqRow.analysis_snapshot_id)
          .maybeSingle();

        if (snapError) {
          console.error("[generate-report-pdf] snapshot lookup failed", snapError);
          await markStatus(reqRow.id, {
            pdf_status: "failed",
            pdf_error_message: "snapshot lookup failed",
          });
          return json(
            {
              success: false,
              error_code: "PERSISTENCE_FAILED",
              message: "Failed to fetch analysis snapshot.",
            },
            500,
          );
        }

        if (!snapRow) {
          await markStatus(reqRow.id, {
            pdf_status: "failed",
            pdf_error_message: "snapshot not found",
          });
          return json(
            {
              success: false,
              error_code: "SNAPSHOT_NOT_FOUND",
              message: "Linked analysis snapshot no longer exists.",
            },
            410,
          );
        }

        if (!isNormalizedPayload(snapRow.normalized_payload)) {
          await markStatus(reqRow.id, {
            pdf_status: "failed",
            pdf_error_message: "malformed snapshot payload",
          });
          return json(
            {
              success: false,
              error_code: "MALFORMED_SNAPSHOT",
              message: "Snapshot payload does not match the expected shape.",
            },
            422,
          );
        }

        // 6) Mark generating before the heavy work.
        await markStatus(reqRow.id, {
          pdf_status: "generating",
          pdf_error_message: null,
        });

        // 7) Render PDF.
        let bytes: Uint8Array;
        try {
          bytes = await renderViaBrowser({
            url: buildSnapshotPrintUrl(snapRow.id),
            waitForGlobalFn: "__pdfReady",
            timeoutSeconds: 90,
          });
        } catch (err) {
          console.error("[generate-report-pdf] render failed", err);
          await markStatus(reqRow.id, {
            pdf_status: "failed",
            pdf_error_message: "render failed",
          });
          return json(
            {
              success: false,
              error_code: "RENDER_FAILED",
              message: "Failed to render the PDF.",
            },
            500,
          );
        }

        // 8) Upload to storage at the deterministic path.
        const storagePath = buildReportPath({
          reportRequestId: reqRow.id,
          requestMonth: reqRow.request_month,
        });

        const upload = await uploadReportPdf(storagePath, bytes);
        if (!upload.ok) {
          console.error("[generate-report-pdf] upload failed", upload.message);
          await markStatus(reqRow.id, {
            pdf_status: "failed",
            pdf_error_message: "upload failed",
          });
          return json(
            {
              success: false,
              error_code: "UPLOAD_FAILED",
              message: "Failed to upload the PDF to storage.",
            },
            500,
          );
        }

        // 9) Persist final status.
        const generatedAt = new Date().toISOString();
        const { error: updError } = await supabaseAdmin
          .from("report_requests")
          .update({
            pdf_status: "ready",
            pdf_storage_path: storagePath,
            pdf_generated_at: generatedAt,
            pdf_error_message: null,
          })
          .eq("id", reqRow.id);

        if (updError) {
          console.error("[generate-report-pdf] final update failed", updError);
          // PDF is uploaded but row not updated — surface as failure so the
          // caller can retry; storage path is deterministic so retry is safe.
          return json(
            {
              success: false,
              error_code: "PERSISTENCE_FAILED",
              message: "PDF generated but the request status could not be persisted.",
            },
            500,
          );
        }

        return json(
          {
            success: true,
            report_request_id: reqRow.id,
            pdf_status: "ready",
            pdf_storage_path: storagePath,
            pdf_generated_at: generatedAt,
            regenerated: reqRow.pdf_status === "ready",
          },
          200,
        );
      },
    },
  },
});
