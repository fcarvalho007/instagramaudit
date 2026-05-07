/**
 * POST /api/admin/generate-beta-report
 *
 * Admin-only endpoint to trigger a Fresh analysis for an approved beta request.
 * Calls /api/analyze-public-v1 server-to-server with INTERNAL_API_TOKEN.
 * Updates report_request status and links the resulting snapshot.
 *
 * Does NOT trigger PDF generation or email delivery.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdminSession } from "@/lib/admin/session";
import {
  isApifyEnabled,
  isTestingModeActive,
  isAllowed,
} from "@/lib/security/apify-allowlist";
import type { Json } from "@/integrations/supabase/types";

const ALLOWED_SOURCE_STATUSES = ["approved", "pending_review", "failed"] as const;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/admin/generate-beta-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Auth
        try {
          await requireAdminSession();
        } catch (res) {
          if (res instanceof Response) return res;
          throw res;
        }

        // 2. Parse body
        let body: { report_request_id?: string; force?: boolean };
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ success: false, error: "Invalid JSON" }, 400);
        }

        const requestId = body.report_request_id?.trim();
        if (!requestId) {
          return jsonResponse({ success: false, error: "report_request_id required" }, 400);
        }

        // 3. Load report_request
        const { data: rr, error: rrErr } = await supabaseAdmin
          .from("report_requests")
          .select("id, instagram_username, competitor_usernames, request_status, analysis_snapshot_id, lead_id, metadata")
          .eq("id", requestId)
          .maybeSingle();

        if (rrErr) {
          console.error("[generate-beta-report] query failed", rrErr);
          return jsonResponse({ success: false, error: "Database error" }, 500);
        }
        if (!rr) {
          return jsonResponse({ success: false, error: "Report request not found" }, 404);
        }

        // 4. Validate status
        if (!ALLOWED_SOURCE_STATUSES.includes(rr.request_status as typeof ALLOWED_SOURCE_STATUSES[number])) {
          return jsonResponse({
            success: false,
            error: `Cannot generate from status '${rr.request_status}'. Must be approved, pending_review or failed.`,
          }, 400);
        }

        // 5. Pre-flight: INTERNAL_API_TOKEN
        const internalToken = process.env.INTERNAL_API_TOKEN;
        if (!internalToken) {
          return jsonResponse({
            success: false,
            error: "INTERNAL_API_TOKEN não configurado. Verifique os segredos do sistema.",
            preflight_blocked: "internal_token_missing",
          }, 409);
        }

        // 6. Pre-flight: APIFY_ENABLED
        if (!isApifyEnabled()) {
          return jsonResponse({
            success: false,
            error: "APIFY_ENABLED is not 'true'. Provider is disabled.",
            preflight_blocked: "apify_disabled",
          }, 409);
        }

        // 7. Pre-flight: allowlist warning (non-blocking, just info)
        const handle = rr.instagram_username!;
        const allowlistWarning = isTestingModeActive() && !isAllowed(handle)
          ? `Handle @${handle} is NOT on the allowlist. The analysis will be blocked by the provider.`
          : null;

        if (allowlistWarning) {
          return jsonResponse({
            success: false,
            error: allowlistWarning,
            preflight_blocked: "allowlist",
          }, 409);
        }

        // 8. Set status to processing
        const { error: updateErr } = await supabaseAdmin
          .from("report_requests")
          .update({ request_status: "processing", updated_at: new Date().toISOString() })
          .eq("id", requestId);

        if (updateErr) {
          console.error("[generate-beta-report] failed to set processing", updateErr);
          return jsonResponse({ success: false, error: "Failed to update status" }, 500);
        }

        // 9. Call analyze-public-v1 server-to-server
        const origin = new URL(request.url).origin;

        const competitors = Array.isArray(rr.competitor_usernames)
          ? (rr.competitor_usernames as string[])
          : [];

        try {
          const analyzeUrl = `${origin}/api/analyze-public-v1?refresh=1`;
          const analyzeRes = await fetch(analyzeUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${internalToken}`,
            },
            body: JSON.stringify({
              instagram_username: handle,
              competitor_usernames: competitors,
            }),
          });

          const analyzeBody = await analyzeRes.json() as {
            success: boolean;
            analysis_snapshot_id?: string;
            error_code?: string;
            message?: string;
          };

          if (!analyzeRes.ok || !analyzeBody.success) {
            // Rollback to failed
            const errorInfo = analyzeBody.message ?? analyzeBody.error_code ?? "Unknown provider error";
            console.error("[generate-beta-report] analyze call failed", analyzeRes.status, errorInfo);

            const existingMeta = (rr.metadata && typeof rr.metadata === "object" && !Array.isArray(rr.metadata))
              ? rr.metadata as Record<string, Json>
              : {};

            await supabaseAdmin
              .from("report_requests")
              .update({
                request_status: "failed",
                updated_at: new Date().toISOString(),
                metadata: {
                  ...existingMeta,
                  generation_error: errorInfo,
                  generation_failed_at: new Date().toISOString(),
                } as Json,
              })
              .eq("id", requestId);

            return jsonResponse({
              success: false,
              error: `Analysis failed: ${errorInfo}`,
            }, 502);
          }

          // 10. Success — link snapshot
          const snapshotId = analyzeBody.analysis_snapshot_id ?? null;

          const existingMeta = (rr.metadata && typeof rr.metadata === "object" && !Array.isArray(rr.metadata))
            ? rr.metadata as Record<string, Json>
            : {};

          await supabaseAdmin
            .from("report_requests")
            .update({
              request_status: "completed",
              analysis_snapshot_id: snapshotId,
              updated_at: new Date().toISOString(),
              metadata: {
                ...existingMeta,
                generation_completed_at: new Date().toISOString(),
              } as Json,
            })
            .eq("id", requestId);

          // 11. Record product event (fire-and-forget)
          try {
            await supabaseAdmin.from("product_events").insert([{
              event_type: "report_generated",
              lead_id: rr.lead_id,
              handle,
              snapshot_id: snapshotId,
              metadata: {
                report_request_id: requestId,
                source: "admin_beta_queue",
              } as Json,
            }]);
          } catch { /* non-critical */ }

          return jsonResponse({
            success: true,
            analysis_snapshot_id: snapshotId,
            request_status: "completed",
          });

        } catch (err) {
          // Network/unexpected error — mark as failed
          const msg = err instanceof Error ? err.message : "Unknown error";
          console.error("[generate-beta-report] unexpected error", msg);

          const existingMeta = (rr.metadata && typeof rr.metadata === "object" && !Array.isArray(rr.metadata))
            ? rr.metadata as Record<string, Json>
            : {};

          await supabaseAdmin
            .from("report_requests")
            .update({
              request_status: "failed",
              updated_at: new Date().toISOString(),
              metadata: {
                ...existingMeta,
                generation_error: msg,
                generation_failed_at: new Date().toISOString(),
              } as Json,
            })
            .eq("id", requestId);

          return jsonResponse({ success: false, error: msg }, 500);
        }
      },
    },
  },
});