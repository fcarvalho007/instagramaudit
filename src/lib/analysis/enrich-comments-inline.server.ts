/**
 * Direct comment enrichment logic — callable from any server context.
 * Replaces the fire-and-forget HTTP self-call pattern that fails on Workers.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  fetchCommentsForPosts,
  COMMENT_SCRAPER_MAX_POSTS,
  COMMENT_SCRAPER_MAX_TOTAL_RESULTS,
  COMMENT_SCRAPER_MAX_CHARGE_USD,
} from "@/lib/analysis/comment-scraper.server";
import {
  aggregateCommentIntelligence,
  buildUnavailableCommentIntelligence,
} from "@/lib/analysis/comment-intelligence";
import { recordProviderCall } from "@/lib/analysis/events";
import { ApifyConfigError, ApifyUpstreamError } from "@/lib/analysis/apify-client";
import type { CommentIntelligence } from "@/lib/analysis/types";

const LOG = "[enrich-comments-inline]";

export interface EnrichCommentsInput {
  snapshotId: string;
  username: string;
  postUrls: string[];
}

export async function enrichCommentsInline(
  input: EnrichCommentsInput,
): Promise<{ ok: boolean; error?: string }> {
  const { snapshotId, username, postUrls } = input;

  const validUrls = [...new Set(postUrls)].slice(0, COMMENT_SCRAPER_MAX_POSTS);

  if (validUrls.length === 0) {
    console.info(LOG, "no valid post URLs, skipping");
    return { ok: true };
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
    });
  } catch (err) {
    console.error(LOG, "comment scraper failed", err);

    commentIntelligence = buildUnavailableCommentIntelligence(
      username,
      "comment_scraper_failed",
    );

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

    // Still patch snapshot with unavailable intelligence
  }

  // Patch the snapshot
  try {
    const { data: snapshot, error: fetchErr } = await supabaseAdmin
      .from("analysis_snapshots")
      .select("normalized_payload")
      .eq("id", snapshotId)
      .single();

    if (fetchErr || !snapshot) {
      console.error(LOG, "snapshot not found", snapshotId, fetchErr?.message);
      return { ok: false, error: "snapshot_not_found" };
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
      return { ok: false, error: "snapshot_update_failed" };
    }

    console.info(LOG, "snapshot patched with comment intelligence", snapshotId);
    return { ok: true };
  } catch (patchErr) {
    console.error(LOG, "snapshot patch threw", patchErr);
    return { ok: false, error: "snapshot_patch_failed" };
  }
}