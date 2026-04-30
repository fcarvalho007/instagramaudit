/**
 * POST /api/public/public-report-pdf
 *
 * Snapshot-keyed public PDF endpoint used by `/analyze/$username`.
 *
 * - Validates `{ snapshot_id }`.
 * - Loads the snapshot (read-only) from `analysis_snapshots`.
 * - Reuses `renderReportPdf` (same renderer as the email-gated flow).
 * - Caches the resulting PDF inside the existing private `report-pdfs`
 *   bucket under `reports/snapshots/<YYYY>/<MM>/<snapshot_id>.pdf` —
 *   distinct from the `reports/<YYYY>/<MM>/<report_request_id>.pdf`
 *   layout used by the email-gated flow, so the two flows never collide.
 * - Returns a short-lived signed URL (600s / 10 min). Bucket stays private.
 * - Logs the call into `analysis_events` via `record_analysis_event`
 *   so the admin cockpit reflects public PDF usage.
 *
 * Does NOT touch `report_requests`, the email/lead flow, or any provider
 * (Apify / DataForSEO / OpenAI). No rate limiting (project policy).
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { isNormalizedPayload } from "@/lib/pdf/payload-guard";
import { renderViaBrowser } from "@/lib/pdf/render-via-browser.server";
import { buildSnapshotPrintUrl } from "@/lib/pdf/print-url.server";
import {
  buildPublicSnapshotPdfPath,
  pdfExistsAtPath,
  signReportPdfUrl,
  uploadReportPdf,
} from "@/lib/pdf/storage";

const SIGNED_URL_TTL_SECONDS = 600;

const PayloadSchema = z.object({
  snapshot_id: z.string().uuid(),
});

type SuccessBody = {
  success: true;
  snapshot_id: string;
  pdf_status: "ready";
  signed_url: string;
  expires_in: number;
  cached: boolean;
};

type FailureBody = {
  success: false;
  error_code:
    | "INVALID_PAYLOAD"
    | "SNAPSHOT_NOT_FOUND"
    | "MALFORMED_SNAPSHOT"
    | "RENDER_FAILED"
    | "UPLOAD_FAILED"
    | "SIGN_FAILED";
  message: string;
};

const json = (body: SuccessBody | FailureBody, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

async function logEvent(args: {
  handle: string | null;
  snapshotId: string;
  dataSource: "cache" | "fresh";
  outcome: string;
  errorCode: string | null;
  durationMs: number;
}): Promise<void> {
  try {
    await supabaseAdmin.rpc("record_analysis_event", {
      p_network: "instagram",
      p_handle: args.handle ?? "unknown",
      p_competitor_handles: [],
      p_cache_key: `public_pdf:${args.snapshotId}`,
      p_data_source: args.dataSource,
      p_outcome: args.outcome,
      p_error_code: args.errorCode as string,
      p_analysis_snapshot_id: args.snapshotId,
      p_provider_call_log_id: null as unknown as string,
      p_posts_returned: 0,
      p_profiles_returned: 0,
      p_estimated_cost_usd: 0,
      p_duration_ms: args.durationMs,
      p_request_ip_hash: null as unknown as string,
      p_user_agent_family: null as unknown as string,
    });
  } catch (err) {
    // Logging must never break the user-facing flow.
    console.error("[public-report-pdf] event log failed", err);
  }
}

export const Route = createFileRoute("/api/public/public-report-pdf")({
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
        const start = Date.now();

        // 1) Parse + validate body.
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

        const { snapshot_id } = parsed.data;

        // 2) Load the snapshot (read-only).
        const { data: snapRow, error: snapError } = await supabaseAdmin
          .from("analysis_snapshots")
          .select("id, instagram_username, normalized_payload, created_at")
          .eq("id", snapshot_id)
          .maybeSingle();

        if (snapError) {
          console.error("[public-report-pdf] snapshot lookup failed", snapError);
          return json(
            {
              success: false,
              error_code: "SNAPSHOT_NOT_FOUND",
              message: "Snapshot lookup failed.",
            },
            500,
          );
        }

        if (!snapRow) {
          return json(
            {
              success: false,
              error_code: "SNAPSHOT_NOT_FOUND",
              message: "Snapshot não encontrado.",
            },
            404,
          );
        }

        if (!isNormalizedPayload(snapRow.normalized_payload)) {
          return json(
            {
              success: false,
              error_code: "MALFORMED_SNAPSHOT",
              message: "Snapshot payload inválido.",
            },
            422,
          );
        }

        // 3) Resolve deterministic storage path.
        const storagePath = buildPublicSnapshotPdfPath({
          snapshotId: snapRow.id,
          createdAtIso: snapRow.created_at,
        });

        // 4) Cache check — if PDF already exists, just sign and return.
        const cached = await pdfExistsAtPath(storagePath);

        if (!cached) {
          // 5a) Render.
          let bytes: Uint8Array;
          try {
            bytes = await renderViaBrowser({
              url: buildSnapshotPrintUrl(snapRow.id),
              waitForGlobalFn: "pdfReady",
              timeoutSeconds: 90,
            });
          } catch (err) {
            console.error("[public-report-pdf] render failed", err);
            await logEvent({
              handle: snapRow.instagram_username,
              snapshotId: snapRow.id,
              dataSource: "fresh",
              outcome: "provider_error",
              errorCode: "RENDER_FAILED",
              durationMs: Date.now() - start,
            });
            return json(
              {
                success: false,
                error_code: "RENDER_FAILED",
                message: "Falha ao gerar o PDF.",
              },
              500,
            );
          }

          // 5b) Upload.
          const upload = await uploadReportPdf(storagePath, bytes);
          if (!upload.ok) {
            console.error("[public-report-pdf] upload failed", upload.message);
            await logEvent({
              handle: snapRow.instagram_username,
              snapshotId: snapRow.id,
              dataSource: "fresh",
              outcome: "provider_error",
              errorCode: "UPLOAD_FAILED",
              durationMs: Date.now() - start,
            });
            return json(
              {
                success: false,
                error_code: "UPLOAD_FAILED",
                message: "Falha ao guardar o PDF.",
              },
              500,
            );
          }
        }

        // 6) Sign (private bucket, short-lived URL).
        const signed = await signReportPdfUrl(storagePath, SIGNED_URL_TTL_SECONDS);
        if (!signed.ok) {
          console.error("[public-report-pdf] sign failed", signed.message);
          await logEvent({
            handle: snapRow.instagram_username,
            snapshotId: snapRow.id,
            dataSource: cached ? "cache" : "fresh",
            outcome: "provider_error",
            errorCode: "SIGN_FAILED",
            durationMs: Date.now() - start,
          });
          return json(
            {
              success: false,
              error_code: "SIGN_FAILED",
              message: "Falha a assinar o URL do PDF.",
            },
            500,
          );
        }

        // 7) Log success.
        await logEvent({
          handle: snapRow.instagram_username,
          snapshotId: snapRow.id,
          dataSource: cached ? "cache" : "fresh",
          outcome: "public_pdf",
          errorCode: null,
          durationMs: Date.now() - start,
        });

        return json(
          {
            success: true,
            snapshot_id: snapRow.id,
            pdf_status: "ready",
            signed_url: signed.url,
            expires_in: SIGNED_URL_TTL_SECONDS,
            cached,
          },
          200,
        );
      },
    },
  },
});