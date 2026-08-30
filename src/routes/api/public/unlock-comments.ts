/**
 * Level-2 unlock endpoint for Comment Intelligence.
 *
 * POST /api/public/unlock-comments   { cache_key }
 *   → 200 { status: "queued" | "already_available" | "pending" | "degraded" }
 *   → 401 { error: "ONBOARDING_REQUIRED" }  (no lead session)
 *   → 403 { error: "REPORT_NOT_OWNED" }
 *   → 429 { error: "RATE_LIMITED" }
 *
 * Security model (no parallel access system — reuses what already exists):
 *  - the client sends a `cache_key`, never a snapshot id, so arbitrary
 *    snapshots cannot be targeted;
 *  - the lead session cookie (or the scoped `report_capture_session`) must
 *    own that report (`leadOwnsReport`), which
 *    is written when the report is claimed — a random email cannot unlock
 *    someone else's snapshot;
 *  - idempotency, rate limits and the monthly soft cap live in
 *    `runCommentUnlock`, shared with `/api/public/lead-capture`.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { readLeadIdFromRequest } from "@/lib/leads/lead-cookie.server";
import { readCaptureLeadIdFromRequest } from "@/lib/leads/report-capture-session.server";
import { clientIp, runCommentUnlock } from "@/lib/enrichment/unlock-comments.server";

const BodySchema = z.object({
  cache_key: z.string().min(8).max(256),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/unlock-comments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsedBody: unknown;
        try {
          parsedBody = await request.json();
        } catch {
          return json({ error: "INVALID_BODY" }, 400);
        }

        const parsed = BodySchema.safeParse(parsedBody);
        if (!parsed.success) return json({ error: "INVALID_BODY" }, 400);

        // Level 2 exige um lead: sessão completa (email verificado) ou
        // `report_capture_session` de âmbito restrito a esta `cache_key`.
        const leadId =
          readLeadIdFromRequest(request) ??
          readCaptureLeadIdFromRequest(request, parsed.data.cache_key);
        if (!leadId) return json({ error: "ONBOARDING_REQUIRED" }, 401);

        const outcome = await runCommentUnlock({
          leadId,
          cacheKey: parsed.data.cache_key,
          origin: new URL(request.url).origin,
          ip: clientIp(request),
        });

        if (!outcome.ok) return json({ error: outcome.error }, outcome.httpStatus);
        return json(
          outcome.status === "degraded"
            ? { status: "degraded", reason: outcome.reason }
            : { status: outcome.status },
        );
      },
    },
  },
});
