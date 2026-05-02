/**
 * Comment Intelligence — unit tests.
 *
 * Pure aggregation + gate logic. No I/O, no provider calls.
 */

import { describe, it, expect } from "vitest";
import {
  aggregateCommentIntelligence,
  buildUnavailableCommentIntelligence,
  type PostCommentBatch,
  type RawApifyComment,
} from "../comment-intelligence";
import { shouldRunCommentScraper } from "../comment-scraper.server";

// ─────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────

const audienceComment = (username: string, text?: string, replies?: RawApifyComment[]): RawApifyComment => ({
  id: `c-${username}`,
  text: text ?? `Comment by ${username}`,
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
    expect(shouldRunCommentScraper({ featureEnabled: false })).toBe(false);
  });

  it("returns true when feature is enabled (free report)", () => {
    expect(shouldRunCommentScraper({ featureEnabled: true })).toBe(true);
  });

  it("returns true when feature enabled and internal test", () => {
    expect(
      shouldRunCommentScraper({ featureEnabled: true, isInternalTest: true }),
    ).toBe(true);
  });

  it("returns true when feature disabled but internal test is true", () => {
    expect(
      shouldRunCommentScraper({ featureEnabled: false, isInternalTest: true }),
    ).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────
// buildUnavailableCommentIntelligence
// ─────────────────────────────────────────────────────────────────────

describe("buildUnavailableCommentIntelligence", () => {
  it("returns available=false with reason", () => {
    const result = buildUnavailableCommentIntelligence(OWNER, "comment_scraper_failed");
    expect(result.available).toBe(false);
    expect(result.reason).toBe("comment_scraper_failed");
    expect(result.ownerUsername).toBe(OWNER);
    expect(result.samplePosts).toBe(0);
    expect(result.dominantConversationSignals).toEqual([]);
    expect(result.recommendedConversationAction).toBe("");
  });

  it("does not contain raw text or third-party usernames", () => {
    const result = buildUnavailableCommentIntelligence("testuser", "comment_scraper_disabled");
    const json = JSON.stringify(result);
    expect(json).not.toContain("Comment by");
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
    expect(result.uniqueAudienceCommentersCount).toBe(0);
    expect(result.postsWithConversationPct).toBe(0);
    expect(result.questionsFromAudienceCount).toBe(0);
    expect(result.dominantConversationSignals).toEqual([]);
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
          audienceComment("fan1", "Great post!", [
            audienceComment(OWNER, "Thanks!"), // owner replied
            audienceComment("fan2", "Agreed!"), // audience nested reply
          ]),
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    expect(result.ownerRepliesCount).toBe(1); // only the nested reply
    expect(result.audienceCommentsCount).toBe(2); // fan1 top-level + fan2 reply
    expect(result.sampleReplies).toBe(2); // 2 nested replies
    expect(result.postsWithOwnerReplyPct).toBe(100);
    expect(result.postsWithConversationPct).toBe(100);
  });

  it("includes reply-level comments in sampleComments total", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/A/",
        comments: [
          audienceComment("x", "hello", [audienceComment("y", "hi"), audienceComment("z", "hey")]),
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
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
    expect(result.postsWithOwnerReplyPct).toBe(0);
    expect(result.topConversationPost).toBeUndefined();
  });

  it("output never contains raw comment text", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/E/",
        comments: [audienceComment("fan_with_text", "Secret text here")],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    const json = JSON.stringify(result);
    expect(json).not.toContain("Secret text here");
    expect(json).not.toContain("fan_with_text");
    expect(result.ownerUsername).toBe(OWNER);
  });

  it("tracks topConversationPost by most owner replies", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/low/",
        comments: [
          audienceComment("a", "nice", [audienceComment(OWNER, "ty")]),
        ],
      },
      {
        postUrl: "https://instagram.com/p/high/",
        comments: [
          audienceComment("b", "wow", [audienceComment(OWNER, "thx"), audienceComment(OWNER, "yes")]),
          audienceComment("c", "cool", [audienceComment(OWNER, "thanks")]),
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    expect(result.topConversationPost?.postUrl).toBe("https://instagram.com/p/high/");
    expect(result.topConversationPost?.ownerRepliesCount).toBe(3);
  });

  it("counts unique audience commenters", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/U/",
        comments: [
          audienceComment("alice"),
          audienceComment("bob"),
          audienceComment("alice"), // duplicate
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    expect(result.uniqueAudienceCommentersCount).toBe(2);
  });

  it("classifies questions from audience", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/Q/",
        comments: [
          audienceComment("fan1", "Onde posso comprar isto?"),
          audienceComment("fan2", "Quanto custa?"),
          audienceComment("fan3", "Lindo!"),
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    expect(result.questionsFromAudienceCount).toBe(2); // both have ? so both are questions
    expect(result.buyingIntentCount).toBe(0); // ? takes precedence over buying_intent
  });

  it("classifies praise signals", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/P/",
        comments: [
          audienceComment("fan1", "Incrível trabalho, parabéns!"),
          audienceComment("fan2", "Amazing content!"),
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    expect(result.praiseCount).toBe(2);
  });

  it("generates dominant conversation signals", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/S/",
        comments: [
          audienceComment("a", "Incrível!"),
          audienceComment("b", "Maravilhoso!"),
          audienceComment("c", "Where can I buy?"),
          audienceComment("d", "Não funciona"),
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    expect(result.dominantConversationSignals.length).toBeGreaterThan(0);
    expect(result.dominantConversationSignals[0]).toBe("praise");
  });

  it("generates a recommendation for low reply rate", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/R/",
        comments: [
          audienceComment("fan1", "Hello"),
          audienceComment("fan2", "World"),
          audienceComment("fan3", "Test comment here"),
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    expect(result.recommendedConversationAction).toContain("Taxa de resposta");
  });
});

// ─────────────────────────────────────────────────────────────────────
// Edge cases — failure scenarios / empty data
// ─────────────────────────────────────────────────────────────────────

describe("aggregateCommentIntelligence — edge cases", () => {
  it("handles comments without any replies array", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/no-replies/",
        comments: [
          { id: "1", ownerUsername: "fan1", likesCount: 5 },
          { id: "2", ownerUsername: "fan2", likesCount: 2 },
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    expect(result.sampleComments).toBe(2);
    expect(result.sampleReplies).toBe(0);
    expect(result.audienceCommentsCount).toBe(2);
    expect(result.ownerRepliesCount).toBe(0);
    expect(result.ownerReplyRatePct).toBe(0);
  });

  it("handles empty comments array per post", () => {
    const batches: PostCommentBatch[] = [
      { postUrl: "https://instagram.com/p/empty1/", comments: [] },
      { postUrl: "https://instagram.com/p/empty2/", comments: [] },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    expect(result.available).toBe(true);
    expect(result.samplePosts).toBe(2);
    expect(result.sampleComments).toBe(0);
    expect(result.audienceCommentsCount).toBe(0);
    expect(result.ownerRepliesCount).toBe(0);
    expect(result.postsWithOwnerReplyPct).toBe(0);
    expect(result.topConversationPost).toBeUndefined();
  });

  it("handles comments with no owner replies at all", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/no-owner/",
        comments: [
          audienceComment("fan_a"),
          audienceComment("fan_b", "nice", [audienceComment("fan_c")]),
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    expect(result.ownerRepliesCount).toBe(0);
    expect(result.audienceCommentsCount).toBe(3);
    expect(result.ownerReplyRatePct).toBe(0);
    expect(result.postsWithOwnerReplyPct).toBe(0);
    expect(result.topConversationPost).toBeUndefined();
  });

  it("handles comments with empty ownerUsername", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/anon/",
        comments: [
          { id: "1", text: "hello", ownerUsername: undefined },
          { id: "2", text: "world", ownerUsername: "" },
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    expect(result.audienceCommentsCount).toBe(2);
    expect(result.ownerRepliesCount).toBe(0);
  });

  it("handles single post with only owner comments (no audience)", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/solo/",
        comments: [
          audienceComment(OWNER),
          audienceComment(OWNER),
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    expect(result.ownerRepliesCount).toBe(2);
    expect(result.audienceCommentsCount).toBe(0);
    expect(result.ownerReplyRatePct).toBe(0);
  });

  it("handles replies with empty array", () => {
    const batches: PostCommentBatch[] = [
      {
        postUrl: "https://instagram.com/p/empty-replies/",
        comments: [
          { id: "1", ownerUsername: "fan", replies: [] },
        ],
      },
    ];
    const result = aggregateCommentIntelligence(OWNER, batches);
    expect(result.sampleComments).toBe(1);
    expect(result.sampleReplies).toBe(0);
  });

  it("scraper failure produces available=false without breaking report", () => {
    const unavailable = buildUnavailableCommentIntelligence(OWNER, "comment_scraper_failed");
    expect(unavailable.available).toBe(false);
    expect(unavailable.reason).toBe("comment_scraper_failed");
    expect(unavailable.samplePosts).toBe(0);
    expect(unavailable.limitations.length).toBeGreaterThan(0);
  });
});
