/**
 * Comment Intelligence — unit tests.
 *
 * Pure aggregation + gate logic. No I/O, no provider calls.
 */

import { describe, it, expect } from "vitest";
import {
  aggregateCommentIntelligence,
  type PostCommentBatch,
  type RawApifyComment,
} from "../comment-intelligence";
import { shouldRunCommentScraper } from "../comment-scraper.server";

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

const audienceComment = (username: string, replies?: RawApifyComment[]): RawApifyComment => ({
  id: `c-${username}`,
  text: `Comment by ${username}`,
  ownerUsername: username,
  timestamp: "2025-01-15T12:00:00.000Z",
  likesCount: 3,
  repliesCount: replies?.length ?? 0,
  replies,
});

const OWNER = "mybrand";

// ─────────────────────────────────────────────────────────────────────
// shouldRunCommentScraper
// ─────────────────────────────────────────────────────────────────────

describe("shouldRunCommentScraper", () => {
  it("returns false when feature is disabled", () => {
    expect(shouldRunCommentScraper({ featureEnabled: false, isProAnalysis: true })).toBe(false);
  });

  it("returns false when feature enabled but not PRO and not internal test", () => {
    expect(shouldRunCommentScraper({ featureEnabled: true, isProAnalysis: false })).toBe(false);
  });

  it("returns true when feature enabled and PRO analysis", () => {
    expect(shouldRunCommentScraper({ featureEnabled: true, isProAnalysis: true })).toBe(true);
  });

  it("returns true when feature enabled and internal test", () => {
    expect(
      shouldRunCommentScraper({ featureEnabled: true, isProAnalysis: false, isInternalTest: true }),
    ).toBe(true);
  });

  it("returns false when feature disabled even with internal test", () => {
    expect(
      shouldRunCommentScraper({ featureEnabled: false, isProAnalysis: false, isInternalTest: true }),
    ).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────
// aggregateCommentIntelligence
// ─────────────────────────────────────────────────────────────────────

describe("aggregateCommentIntelligence", () => {
  it("returns baseline zeros for empty batches", () => {
    const result = aggregateCommentIntelligence(OWNER, []);
    expect(result.available).toBe(true);
    expect(result.samplePosts).toBe(0);
    expect(result.sampleComments).toBe(0);
    expect(result.sampleReplies).toBe(0);
    expect(result.audienceCommentsCount).toBe(0);
    expect(result.ownerRepliesCount).toBe(0);
    expect(result.ownerReplyRatePct).toBe(0);
    expect(result.topConversationPost).toBeUndefined();
  });

  it("counts audience comments correctly and excludes owner", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/ABC123/",
        comments: [
          audienceComment("user_a"),
          audienceComment("user_b"),
          audienceComment(OWNER), // brand's own comment — NOT audience
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    expect(result.audienceCommentsCount).toBe(2);
    expect(result.ownerRepliesCount).toBe(1);
    expect(result.sampleComments).toBe(3); // all top-level
  });

  it("detects owner replies in nested replies[]", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/XYZ/",
        comments: [
          audienceComment("fan1", [
            audienceComment(OWNER), // owner replied
            audienceComment("fan2"), // audience nested reply
          ]),
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    expect(result.ownerRepliesCount).toBe(1); // only the nested reply
    expect(result.audienceCommentsCount).toBe(2); // fan1 top-level + fan2 reply
    expect(result.sampleReplies).toBe(2); // 2 nested replies
    expect(result.postsWithOwnerReplyPct).toBe(100);
  });

  it("includes reply-level comments in sampleComments total", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/A/",
        comments: [
          audienceComment("x", [audienceComment("y"), audienceComment("z")]),
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    // 1 top-level + 2 replies = 3 total
    expect(result.sampleComments).toBe(3);
    expect(result.sampleReplies).toBe(2);
  });

  it("does not count brand top-level comments as audience comments", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/B/",
        comments: [
          audienceComment(OWNER),
          audienceComment(OWNER),
          audienceComment("real_fan"),
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    expect(result.audienceCommentsCount).toBe(1);
    expect(result.ownerRepliesCount).toBe(2);
  });

  it("normalizes @-prefixed and uppercase owner usernames", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/C/",
        comments: [
          { ...audienceComment("x"), ownerUsername: "@MyBrand" },
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    expect(result.ownerRepliesCount).toBe(1);
    expect(result.audienceCommentsCount).toBe(0);
  });

  it("adds limitation note when groupedByPost is false", () => {
    const batches: PostCommentBatch[] = [
      { postUrl: "https://instagram.com/p/D/", comments: [audienceComment("fan")] },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches, { groupedByPost: false });
    expect(result.limitations).toContain(
      "Granularidade por publicação indisponível — métricas agregadas globalmente.",
    );
    // postsWithOwnerReplyPct should be 0 when not grouped
    expect(result.postsWithOwnerReplyPct).toBe(0);
    // topConversationPost should be undefined when not grouped
    expect(result.topConversationPost).toBeUndefined();
  });

  it("output never contains raw comment text", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/E/",
        comments: [audienceComment("fan_with_text")],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    const json = JSON.stringify(result);
    expect(json).not.toContain("Comment by fan_with_text");
    // Only ownerUsername (the profile's own) should be present
    expect(result.ownerUsername).toBe(OWNER);
  });

  it("tracks topConversationPost by most owner replies", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/low/",
        comments: [
          audienceComment("a", [audienceComment(OWNER)]),
        ],
      },
      {
        postUrl: "https://instagram.com/p/high/",
        comments: [
          audienceComment("b", [audienceComment(OWNER), audienceComment(OWNER)]),
          audienceComment("c", [audienceComment(OWNER)]),
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    expect(result.topConversationPost?.postUrl).toBe("https://instagram.com/p/high/");
    expect(result.topConversationPost?.ownerRepliesCount).toBe(3);
  });
});