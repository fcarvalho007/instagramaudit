/**
 * Level-2 unlock endpoint for Comment Intelligence.
 *
 * POST /api/public/unlock-comments   { cache_key }
 *   → 200 { status: "queued" | "already_available" | "pending" }
 *   → 401 { error: "ONBOARDING_REQUIRED" }  (no lead session)
 *   → 403 { error: "REPORT_NOT_OWNED" }
 *
 * The base analysis (apify/instagram-scraper) is NEVER repeated here. This
 * only creates a `comment_enrichment_jobs` row for an existing snapshot and
 * triggers the comment actor, so the second free level costs exactly one
 * extra Actor run.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { readLeadIdFromRequest } from "@/lib/leads/lead-cookie.server";
import { leadOwnsReport } from "@/lib/credits/lead-reports.server";
import { enqueueCommentScrapingForSnapshot } from "@/lib/enrichment/enqueue-paid.server";

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

        // Level 2 requires a lead (name + email already captured).
        const leadId = readLeadIdFromRequest(request);
        if (!leadId) return json({ error: "ONBOARDING_REQUIRED" }, 401);

        const cacheKey = parsed.data.cache_key;
        const owns = await leadOwnsReport(leadId, cacheKey);
        if (!owns) return json({ error: "REPORT_NOT_OWNED" }, 403);

        const { data: snap } = await supabaseAdmin
          .from("analysis_snapshots")
          .select("id, normalized_payload")
          .eq("cache_key", cacheKey)
          .maybeSingle();
        if (!snap?.id) return json({ error: "SNAPSHOT_NOT_FOUND" }, 404);

        const payload = (snap.normalized_payload ?? {}) as Record<string, unknown>;
        const ci = payload.comment_intelligence as { available?: boolean } | undefined;
        if (ci?.available === true) return json({ status: "already_available" });

        const { data: existingJob } = await supabaseAdmin
          .from("comment_enrichment_jobs")
          .select("id")
          .eq("snapshot_id", snap.id)
          .in("status", ["pending", "processing"])
          .maybeSingle();
        if (existingJob?.id) return json({ status: "pending" });

        await enqueueCommentScrapingForSnapshot({
          snapshotId: snap.id,
          origin: new URL(request.url).origin,
        });

        return json({ status: "queued" });
      },
    },
  },
});
