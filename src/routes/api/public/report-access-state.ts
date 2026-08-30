/**
 * Read-only access-state endpoint for the public report.
 *
 * GET /api/public/report-access-state?snapshotId=<uuid>
 *   → 200 { leadCaptured: boolean }
 *
 * Lets `/analyze/$username` distinguish Estado A (Auditoria Instantânea,
 * anónimo) from Estado B (Análise Aprofundada, email já capturado) for a
 * visitor who returns to the report in a new page session — the in-memory
 * `unlockStatus` is gone but the cookies are not.
 *
 * Security:
 * - Returns a single boolean. Never a lead id, email, handle or history.
 * - Constant response shape in every branch (invalid input, missing
 *   snapshot, error) so it carries no enumeration value.
 * - Reads only signed cookies already issued by the capture / lead flows
 *   (`report_capture_session` scoped to this snapshot's cache_key, or the
 *   global `lead_session`). Writes nothing.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { readCaptureLeadIdFromRequest } from "@/lib/leads/report-capture-session.server";
import { readLeadIdFromRequest } from "@/lib/leads/lead-cookie.server";

const NEGATIVE = { leadCaptured: false } as const;

function json(body: { leadCaptured: boolean }): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
}

export const Route = createFileRoute("/api/public/report-access-state")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const parsed = z
            .string()
            .uuid()
            .safeParse(url.searchParams.get("snapshotId") ?? "");
          if (!parsed.success) return json(NEGATIVE);

          // A global lead session already means the visitor is identified.
          if (readLeadIdFromRequest(request)) return json({ leadCaptured: true });

          const { data } = await supabaseAdmin
            .from("analysis_snapshots")
            .select("cache_key")
            .eq("id", parsed.data)
            .maybeSingle();

          const cacheKey = data?.cache_key;
          if (!cacheKey) return json(NEGATIVE);

          const leadId = readCaptureLeadIdFromRequest(request, cacheKey);
          return json({ leadCaptured: Boolean(leadId) });
        } catch {
          return json(NEGATIVE);
        }
      },
    },
  },
});
