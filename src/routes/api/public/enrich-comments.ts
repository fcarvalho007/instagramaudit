/**
 * Async comment enrichment endpoint.
 *
 * Called fire-and-forget by the main analysis endpoint after it has already
 * returned the response. Runs the Apify comment scraper, aggregates the
 * comment intelligence, and patches the snapshot in-place.
 *
 * Protected by INTERNAL_API_TOKEN — not meant for public consumption.
 */

import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  fetchCommentsForPosts,
  COMMENT_SCRAPER_MAX_POSTS,
  COMMENT_SCRAPER_INCLUDE_REPLIES,
  COMMENT_SCRAPER_MAX_CHARGE_USD,
  COMMENT_SCRAPER_MAX_TOTAL_RESULTS,
} from "@/lib/analysis/comment-scraper.server";
import {
  aggregateCommentIntelligence,
  buildUnavailableCommentIntelligence,
} from "@/lib/analysis/comment-intelligence";
import { recordProviderCall } from "@/lib/analysis/events";
import { ApifyConfigError, ApifyUpstreamError } from "@/lib/analysis/apify-client";
import type { CommentIntelligence } from "@/lib/analysis/types";

const LOG = "[enrich-comments]";

function isValidInstagramPostUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      (u.hostname === "www.instagram.com" || u.hostname === "instagram.com") &&
      /^\/(p|reel)\/[A-Za-z0-9_-]+/.test(u.pathname)
    );
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/enrich-comments")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Verify internal token
        const token = process.env.INTERNAL_API_TOKEN;
        const auth = request.headers.get("Authorization");
        if (!token || auth !== `Bearer ${token}`) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let body: {
          snapshot_id?: string;
          username?: string;
          post_urls?: string[];
        };
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        const snapshotId = body.snapshot_id;
        const username = body.username?.toLowerCase();
        const postUrls = body.post_urls;

        if (!snapshotId || !username || !Array.isArray(postUrls) || postUrls.length === 0) {
          return Response.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Validate & deduplicate Instagram URLs
        const validUrls = [...new Set(
          postUrls.filter((u) => isValidInstagramPostUrl(u)),
        )].slice(0, COMMENT_SCRAPER_MAX_POSTS);

        if (validUrls.length === 0) {
          console.info(LOG, "no valid post URLs, skipping");
          return Response.json({ ok: true, skipped: true, reason: "no_valid_urls" });
        }

        console.info(LOG, "starting", {
          snapshotId,
          username,
          postCount: validUrls.length,
          maxResults: COMMENT_SCRAPER_MAX_TOTAL_RESULTS,
          maxChargeUsd: COMMENT_SCRAPER_MAX_CHARGE_USD,
        });

        let commentIntelligence: CommentIntelligence;

        try {
          const commentResult = await fetchCommentsForPosts(validUrls);

          // Log success
          await recordProviderCall({
            provider: "apify",
            actor: "apify/instagram-comment-scraper",
            network: "instagram",
            handle: username,
            status: "success",
            httpStatus: 200,
            durationMs: commentResult.durationMs,
            postsReturned: commentResult.commentsReturned,
            apifyRunId: commentResult.runId ?? undefined,
            actualCostUsd: commentResult.actualCostUsd ?? undefined,
            errorMessage: undefined,
          });

          commentIntelligence = aggregateCommentIntelligence(
            username,
            commentResult.batches,
            { groupedByPost: commentResult.groupedByPost },
          );

          console.info(LOG, "comment intelligence ready", {
            samplePosts: commentIntelligence.samplePosts,
            ownerReplies: commentIntelligence.ownerRepliesCount,
            audienceComments: commentIntelligence.audienceCommentsCount,
            actualCostUsd: commentResult.actualCostUsd,
            durationMs: commentResult.durationMs,
            estimatedMaxCostUsd: commentResult.estimatedMaxCostUsd,
            hardMaxCostUsd: commentResult.hardMaxCostUsd,
            adjustedResultsLimit: commentResult.adjustedResultsLimit,
            costStatus: commentResult.actualCostUsd != null ? "real" : "unavailable",
          });
        } catch (err) {
          console.error(LOG, "comment scraper failed", err);

          commentIntelligence = buildUnavailableCommentIntelligence(
            username,
            "comment_scraper_failed",
          );

          // Log failure
          let errStatus: "config_error" | "timeout" | "http_error" | "network_error" = "network_error";
          if (err instanceof ApifyConfigError) errStatus = "config_error";
          else if (err instanceof ApifyUpstreamError) {
            errStatus = err.status === 504 ? "timeout" : "http_error";
          }

          try {
            await recordProviderCall({
              provider: "apify",
              actor: "apify/instagram-comment-scraper",
              network: "instagram",
              handle: username,
              status: errStatus,
              httpStatus: err instanceof ApifyUpstreamError ? err.status : undefined,
              durationMs: 0,
              postsReturned: 0,
              errorMessage: err instanceof Error ? err.message.slice(0, 500) : "unknown",
            });
          } catch (logErr) {
            console.error(LOG, "failed to log provider call", logErr);
          }

          return Response.json({
            ok: false,
            error: "comment_scraper_failed",
            status: errStatus,
          });
        }

        // Patch the snapshot with comment intelligence
        try {
          const { data: snapshot, error: fetchErr } = await supabaseAdmin
            .from("analysis_snapshots")
            .select("normalized_payload")
            .eq("id", snapshotId)
            .single();

          if (fetchErr || !snapshot) {
            console.error(LOG, "snapshot not found", snapshotId, fetchErr?.message);
            return Response.json({ ok: false, error: "snapshot_not_found" });
          }

          const payload = snapshot.normalized_payload as Record<string, unknown>;
          const updatedPayload = {
            ...payload,
            comment_intelligence: commentIntelligence as unknown as Record<string, unknown>,
          };

          const { error: updateErr } = await supabaseAdmin
            .from("analysis_snapshots")
            .update({ normalized_payload: updatedPayload as never })
            .eq("id", snapshotId);

          if (updateErr) {
            console.error(LOG, "snapshot update failed", updateErr.message);
            return Response.json({ ok: false, error: "snapshot_update_failed" });
          }

          console.info(LOG, "snapshot patched with comment intelligence", snapshotId);
          return Response.json({ ok: true, snapshotId });
        } catch (patchErr) {
          console.error(LOG, "snapshot patch threw", patchErr);
          return Response.json({ ok: false, error: "snapshot_patch_failed" });
        }
      },
    },
  },
});