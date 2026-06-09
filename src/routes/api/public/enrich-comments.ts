/**
 * Async comment enrichment endpoint — job-table-driven, idempotent.
 *
 * Two modes:
 *   1. `{ job_id: "uuid" }` — process a specific job
 *   2. `{ sweep: true }`   — pick the oldest pending job and process it
 *
 * Protected by INTERNAL_API_TOKEN. Called fire-and-forget by the main
 * analysis endpoint and periodically by pg_cron as a safety net.
 *
 * Budget constants: Target $0.15, Hard cap $0.20. Never changed here.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  fetchCommentsForPosts,
  COMMENT_SCRAPER_MAX_POSTS,
} from "@/lib/analysis/comment-scraper.server";
import {
  aggregateCommentIntelligence,
  buildUnavailableCommentIntelligence,
} from "@/lib/analysis/comment-intelligence";
import { recordProviderCall } from "@/lib/analysis/events";
import { ApifyConfigError, ApifyUpstreamError } from "@/lib/analysis/apify-client";
import type { CommentIntelligence } from "@/lib/analysis/types";
import { setEnrichmentStatusAtomic } from "@/lib/analysis/cache";

const LOG = "[enrich-comments]";
const MAX_ATTEMPTS = 3;

interface JobRow {
  id: string;
  snapshot_id: string;
  analysis_event_id: string | null;
  handle: string;
  post_urls: string[];
  status: string;
  attempts: number;
}

/** Patch the snapshot's normalized_payload with comment_intelligence. */
async function patchSnapshot(
  snapshotId: string,
  ci: CommentIntelligence,
): Promise<boolean> {
  const { data: snapshot, error: fetchErr } = await supabaseAdmin
    .from("analysis_snapshots")
    .select("normalized_payload")
    .eq("id", snapshotId)
    .single();

  if (fetchErr || !snapshot) {
    console.error(LOG, "snapshot not found", snapshotId, fetchErr?.message);
    return false;
  }

  const payload = snapshot.normalized_payload as Record<string, unknown>;
  const updated = {
    ...payload,
    comment_intelligence: ci as unknown as Record<string, unknown>,
  };

  const { error: updateErr } = await supabaseAdmin
    .from("analysis_snapshots")
    .update({ normalized_payload: updated as never })
    .eq("id", snapshotId);

  if (updateErr) {
    console.error(LOG, "snapshot update failed", updateErr.message);
    return false;
  }
  return true;
}

/** Process a single enrichment job. Idempotent — completed jobs are skipped. */
async function processJob(job: JobRow): Promise<{ ok: boolean; error?: string }> {
  // Idempotent guard
  if (job.status === "completed") {
    console.info(LOG, "job already completed, skipping", job.id);
    return { ok: true };
  }

  // Max attempts guard
  if (job.attempts >= MAX_ATTEMPTS) {
    console.warn(LOG, "job exceeded max attempts", job.id, job.attempts);
    await supabaseAdmin
      .from("comment_enrichment_jobs")
      .update({ status: "failed", last_error: "max_attempts_exceeded" } as never)
      .eq("id", job.id);
    // Patch snapshot with failure state
    await patchSnapshot(
      job.snapshot_id,
      buildUnavailableCommentIntelligence(job.handle, "comment_scraper_failed"),
    );
    await setEnrichmentStatusAtomic(job.snapshot_id, "comments", "error");
    return { ok: false, error: "max_attempts_exceeded" };
  }

  // Mark as processing
  await supabaseAdmin
    .from("comment_enrichment_jobs")
    .update({
      status: "processing",
      attempts: job.attempts + 1,
      started_at: new Date().toISOString(),
    } as never)
    .eq("id", job.id);

  const postUrls = (Array.isArray(job.post_urls) ? job.post_urls : [])
    .slice(0, COMMENT_SCRAPER_MAX_POSTS);

  if (postUrls.length === 0) {
    await supabaseAdmin
      .from("comment_enrichment_jobs")
      .update({ status: "completed", completed_at: new Date().toISOString() } as never)
      .eq("id", job.id);
    await patchSnapshot(
      job.snapshot_id,
      buildUnavailableCommentIntelligence(job.handle, "no_valid_post_urls"),
    );
    await setEnrichmentStatusAtomic(job.snapshot_id, "comments", "skipped");
    return { ok: true };
  }

  const startMs = Date.now();
  let commentIntelligence: CommentIntelligence;

  try {
    const commentResult = await fetchCommentsForPosts(postUrls);

    // Record provider call with analysis_event_id linkage
    await recordProviderCall({
      provider: "apify",
      actor: "apify/instagram-comment-scraper",
      network: "instagram",
      handle: job.handle,
      status: "success",
      httpStatus: 200,
      durationMs: commentResult.durationMs,
      postsReturned: commentResult.commentsReturned,
      apifyRunId: commentResult.runId ?? undefined,
      actualCostUsd: commentResult.actualCostUsd ?? undefined,
      errorMessage: undefined,
      analysisEventId: job.analysis_event_id ?? undefined,
      sourceContext: "enrich_comments",
    });

    commentIntelligence = aggregateCommentIntelligence(
      job.handle,
      commentResult.batches,
      { groupedByPost: commentResult.groupedByPost },
    );

    console.info(LOG, "comment intelligence ready", {
      jobId: job.id,
      samplePosts: commentIntelligence.samplePosts,
      ownerReplies: commentIntelligence.ownerRepliesCount,
      audienceComments: commentIntelligence.audienceCommentsCount,
      actualCostUsd: commentResult.actualCostUsd,
      durationMs: commentResult.durationMs,
    });

    // Patch snapshot
    const patched = await patchSnapshot(job.snapshot_id, commentIntelligence);

    // Mark job completed
    await supabaseAdmin
      .from("comment_enrichment_jobs")
      .update({
        status: patched ? "completed" : "failed",
        completed_at: new Date().toISOString(),
        last_error: patched ? null : "snapshot_patch_failed",
      } as never)
      .eq("id", job.id);

    await setEnrichmentStatusAtomic(job.snapshot_id, "comments", patched ? "success" : "error");
    return { ok: patched, error: patched ? undefined : "snapshot_patch_failed" };
  } catch (err) {
    console.error(LOG, "comment scraper failed", err);

    // Determine failure reason
    let failReason: "comment_scraper_failed" | "comment_scraper_timeout" = "comment_scraper_failed";
    let errStatus: "config_error" | "timeout" | "http_error" | "network_error" = "network_error";

    if (err instanceof ApifyConfigError) {
      errStatus = "config_error";
    } else if (err instanceof ApifyUpstreamError) {
      errStatus = err.status === 504 ? "timeout" : "http_error";
      if (err.status === 504) failReason = "comment_scraper_timeout";
    }

    // Record provider call for the failure
    try {
      await recordProviderCall({
        provider: "apify",
        actor: "apify/instagram-comment-scraper",
        network: "instagram",
        handle: job.handle,
        status: errStatus,
        httpStatus: err instanceof ApifyUpstreamError ? err.status : undefined,
        durationMs: Date.now() - startMs,
        postsReturned: 0,
        errorMessage: err instanceof Error ? err.message.slice(0, 500) : "unknown",
        analysisEventId: job.analysis_event_id ?? undefined,
        sourceContext: "enrich_comments",
      });
    } catch (logErr) {
      console.error(LOG, "failed to log provider call", logErr);
    }

    // Patch snapshot with failure state
    await patchSnapshot(
      job.snapshot_id,
      buildUnavailableCommentIntelligence(job.handle, failReason),
    );

    // Mark job failed
    await supabaseAdmin
      .from("comment_enrichment_jobs")
      .update({
        status: "failed",
        last_error: err instanceof Error ? err.message.slice(0, 500) : "unknown",
        completed_at: new Date().toISOString(),
      } as never)
      .eq("id", job.id);

    await setEnrichmentStatusAtomic(job.snapshot_id, "comments", "error");
    return { ok: false, error: failReason };
  }
}

export const Route = createFileRoute("/api/public/enrich-comments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth check — apenas Bearer INTERNAL_API_TOKEN (ver enrich-snapshot
        // para racional: anon key da Supabase é pública).
        const token = process.env.INTERNAL_API_TOKEN;
        const auth = request.headers.get("Authorization");
        const validBearer = token && auth === `Bearer ${token}`;
        if (!validBearer) {
          return Response.json({ error: "Unauthorized" }, { status: 401  });
        }

        let body: { job_id?: string; snapshot_id?: string; sweep?: boolean };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        let job: JobRow | null = null;

        if (body.sweep) {
          // Sweep mode: pick oldest pending job (>60s old)
          const cutoff = new Date(Date.now() - 60_000).toISOString();
          const { data, error } = await supabaseAdmin
            .from("comment_enrichment_jobs")
            .select("id, snapshot_id, analysis_event_id, handle, post_urls, status, attempts")
            .eq("status", "pending")
            .lt("created_at", cutoff)
            .order("created_at", { ascending: true })
            .limit(1)
            .single();

          if (error || !data) {
            return Response.json({ ok: true, swept: false, reason: "no_pending_jobs" });
          }
          job = data as unknown as JobRow;
        } else if (body.job_id) {
          const { data, error } = await supabaseAdmin
            .from("comment_enrichment_jobs")
            .select("id, snapshot_id, analysis_event_id, handle, post_urls, status, attempts")
            .eq("id", body.job_id)
            .single();

          if (error || !data) {
            return Response.json({ error: "Job not found" }, { status: 404 });
          }
          job = data as unknown as JobRow;
        } else if (body.snapshot_id) {
          const { data, error } = await supabaseAdmin
            .from("comment_enrichment_jobs")
            .select("id, snapshot_id, analysis_event_id, handle, post_urls, status, attempts")
            .eq("snapshot_id", body.snapshot_id)
            .in("status", ["pending", "processing"])
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          if (error || !data) {
            return Response.json({ error: "No pending job for snapshot" }, { status: 404 });
          }
          job = data as unknown as JobRow;
        } else {
          return Response.json({ error: "Provide job_id, snapshot_id, or sweep:true" }, { status: 400 });
        }

        const result = await processJob(job);
        return Response.json(result);
      },
    },
  },
});