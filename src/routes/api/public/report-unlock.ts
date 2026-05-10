/**
 * Public unlock endpoint for the gated report page.
 *
 * POST /api/public/report-unlock
 *
 * Captures email + progressive disclosure answers, links the visitor to a
 * lead (created or reused) and to the analysis snapshot via report_requests.
 *
 * No providers, no email sending, no auth. Rate limiting is intentionally
 * deferred to a later phase — defensive 5s event dedup mitigates short-term
 * abuse.
 */

import { createFileRoute } from "@tanstack/react-router";

import { processReportUnlock } from "@/lib/unlock.server";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export const Route = createFileRoute("/api/public/report-unlock")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return json({ success: false, error: "INVALID_PAYLOAD" }, 400);
        }

        const result = await processReportUnlock(payload);

        if (result.success) {
          return json({
            success: true,
            lead_id: result.lead_id,
            report_request_id: result.report_request_id,
            returning_lead: result.returning_lead,
            access_state: result.access_state,
            created_report_request: result.created_report_request,
          });
        }

        return json(
          {
            success: false,
            error: result.error,
            ...(result.issues ? { issues: result.issues } : {}),
          },
          result.status,
        );
      },
    },
  },
});