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
 *  - the lead session cookie must own that report (`leadOwnsReport`), which
 *    is written when the report is claimed — a random email cannot unlock
 *    someone else's snapshot;
 *  - a partial unique index on `comment_enrichment_jobs(snapshot_id)` for
 *    active statuses makes the endpoint idempotent at the database level:
 *    a repeated submission (same or different email) creates 0 new runs;
 *  - per-IP sliding window + a global hourly ceiling bound mass abuse;
 *  - the monthly soft cap degrades instead of consuming the last credits.
 *
 * The base analysis (apify/instagram-scraper) is NEVER repeated here.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { readLeadIdFromRequest } from "@/lib/leads/lead-cookie.server";
import { leadOwnsReport } from "@/lib/credits/lead-reports.server";
import { enqueueCommentScrapingForSnapshot } from "@/lib/enrichment/enqueue-paid.server";
import { isApifyMonthlySoftCapReached } from "@/lib/security/apify-budget.server";

const BodySchema = z.object({
  cache_key: z.string().min(8).max(256),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

// ── Rate limiting ────────────────────────────────────────────────────
const IP_WINDOW_MS = 60 * 60 * 1000;
const IP_MAX_UNLOCKS = readInt("UNLOCK_COMMENTS_MAX_PER_IP_HOUR", 5, 1, 100);
const GLOBAL_MAX_PER_HOUR = readInt(
  "UNLOCK_COMMENTS_MAX_GLOBAL_HOUR",
  30,
  1,
  1000,
);

function readInt(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

const ipHits = new Map<string, number[]>();

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Best-effort in-isolate limiter; the DB ceiling below is authoritative. */
function ipRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < IP_WINDOW_MS);
  if (hits.length >= IP_MAX_UNLOCKS) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  if (ipHits.size > 5000) ipHits.clear();
  return false;
}

/** Global ceiling on new comment jobs per hour, across all instances. */
async function globalHourlyCeilingReached(): Promise<boolean> {
  const sinceIso = new Date(Date.now() - IP_WINDOW_MS).toISOString();
  const { count, error } = await (supabaseAdmin as any)
    .from("comment_enrichment_jobs")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceIso);
  if (error) return false; // fail-open: structural gates still apply
  return (count ?? 0) >= GLOBAL_MAX_PER_HOUR;
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

        // Idempotency: an active job already covers this snapshot.
        const { data: existingJob } = await supabaseAdmin
          .from("comment_enrichment_jobs")
          .select("id")
          .eq("snapshot_id", snap.id)
          .in("status", ["pending", "processing"])
          .maybeSingle();
        if (existingJob?.id) return json({ status: "pending" });

        // Monthly soft cap: degrade instead of burning the last Free credits.
        if (await isApifyMonthlySoftCapReached()) {
          return json({ status: "degraded", reason: "MONTHLY_SOFT_CAP" });
        }

        if (ipRateLimited(clientIp(request)) || (await globalHourlyCeilingReached())) {
          return json({ error: "RATE_LIMITED" }, 429);
        }

        try {
          await enqueueCommentScrapingForSnapshot({
            snapshotId: snap.id,
            origin: new URL(request.url).origin,
          });
        } catch (err) {
          // Unique index on active jobs → concurrent duplicate submission.
          const message = err instanceof Error ? err.message : String(err);
          if (message.includes("duplicate key") || message.includes("23505")) {
            return json({ status: "pending" });
          }
          throw err;
        }

        return json({ status: "queued" });
      },
    },
  },
});
