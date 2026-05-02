/**
 * Pure aggregation logic for comment-level intelligence.
 * No I/O — receives raw Apify comment data, returns CommentIntelligence.
 * Raw comment objects are never persisted (GDPR-safe).
 */

import type { CommentIntelligence } from "./types";

// ─────────────────────────────────────────────────────────────────────
// Apify comment scraper output shape (loose)
// ─────────────────────────────────────────────────────────────────────

export interface RawApifyComment {
  id?: string;
  text?: string;
  ownerUsername?: string;
  timestamp?: string;
  likesCount?: number;
  repliesCount?: number;
  replies?: RawApifyComment[];
}

export interface PostCommentBatch {
  /** The permalink of the post these comments belong to. */
  postUrl: string;
  /** Raw comments returned by the Apify actor for this post. */
  comments: RawApifyComment[];
}

// ─────────────────────────────────────────────────────────────────────
// Core aggregation
// ─────────────────────────────────────────────────────────────────────

const LIMITATIONS: string[] = [
  "Análise de comentários públicos — não inclui DMs.",
  "Não inclui comentários ocultos, apagados ou visíveis apenas com login.",
  "Resultados podem variar consoante o que está publicamente acessível.",
];

function normalizeUsername(u: string): string {
  return u.toLowerCase().trim().replace(/^@/, "");
}

export function aggregateCommentIntelligence(
  profileUsername: string,
  batches: PostCommentBatch[],
): CommentIntelligence {
  const owner = normalizeUsername(profileUsername);

  let totalComments = 0;
  let totalReplies = 0;
  let totalOwnerActions = 0;
  let totalAudienceComments = 0;
  let postsWithOwnerReply = 0;

  let topPost: {
    postUrl: string;
    commentsCount: number;
    ownerRepliesCount: number;
  } | undefined;

  for (const batch of batches) {
    let postOwnerReplies = 0;
    let postCommentCount = 0;

    for (const comment of batch.comments) {
      const commentOwner = normalizeUsername(comment.ownerUsername ?? "");
      const isOwner = commentOwner === owner;

      if (isOwner) {
        postOwnerReplies++;
      } else {
        totalAudienceComments++;
      }
      postCommentCount++;
      totalComments++;

      // Process replies
      if (Array.isArray(comment.replies)) {
        for (const reply of comment.replies) {
          const replyOwner = normalizeUsername(reply.ownerUsername ?? "");
          totalReplies++;

          if (replyOwner === owner) {
            postOwnerReplies++;
          } else {
            totalAudienceComments++;
          }
        }
      }
    }

    totalOwnerActions += postOwnerReplies;

    if (postOwnerReplies > 0) {
      postsWithOwnerReply++;
    }

    // Track top conversation post
    if (!topPost || postOwnerReplies > topPost.ownerRepliesCount) {
      topPost = {
        postUrl: batch.postUrl,
        commentsCount: postCommentCount,
        ownerRepliesCount: postOwnerReplies,
      };
    }
  }

  const samplePosts = batches.length;
  const ownerReplyRatePct =
    totalAudienceComments > 0
      ? Math.round((totalOwnerActions / totalAudienceComments) * 1000) / 10
      : 0;

  const postsWithOwnerReplyPct =
    samplePosts > 0
      ? Math.round((postsWithOwnerReply / samplePosts) * 1000) / 10
      : 0;

  return {
    available: true,
    source: "apify_comments",
    samplePosts,
    sampleComments: totalComments,
    sampleReplies: totalReplies,
    ownerUsername: profileUsername,
    ownerRepliesCount: totalOwnerActions,
    ownerReplyRatePct,
    postsWithOwnerReplyPct,
    audienceCommentsCount: totalAudienceComments,
    topConversationPost:
      topPost && topPost.ownerRepliesCount > 0 ? topPost : undefined,
    limitations: LIMITATIONS,
  };
}