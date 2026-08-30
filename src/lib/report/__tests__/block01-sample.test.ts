import { describe, it, expect } from "vitest";
import { buildBlock01Sample } from "../block01-sample";
import type { SnapshotPost } from "../snapshot-to-report-data";

function makePost(iso: string, opts: { pinned?: boolean } = {}): SnapshotPost {
  const t = new Date(iso).getTime();
  return {
    id: iso,
    taken_at: Math.floor(t / 1000),
    taken_at_iso: iso,
    likes: 10,
    comments: 1,
    is_pinned: opts.pinned ?? false,
    engagement_pct: 1,
    format: "Reels",
  };
}

describe("buildBlock01Sample", () => {
  it("keeps pinned posts in the sample (only timestamps filter)", () => {
    const posts = [
      makePost("2026-05-20T10:00:00Z", { pinned: true }),
      makePost("2026-05-21T10:00:00Z"),
      makePost("2026-05-22T10:00:00Z"),
      makePost("2026-05-23T10:00:00Z"),
    ];
    const s = buildBlock01Sample(posts);
    expect(s.pinnedPostsExcluded).toBe(0);
    expect(s.analyzedPosts).toHaveLength(4);
    expect(s.performancePosts).toHaveLength(4);
    expect(s.cadencePosts).toHaveLength(4);
  });

  it("keeps every post when all of them are pinned", () => {
    const posts = [
      makePost("2026-05-20T10:00:00Z", { pinned: true }),
      makePost("2026-05-22T10:00:00Z", { pinned: true }),
    ];
    const s = buildBlock01Sample(posts);
    expect(s.analyzedPosts).toHaveLength(2);
    expect(s.pinnedPostsExcluded).toBe(0);
  });

  it("computes observedPeriodDays from actual analysed posts", () => {
    const posts = [
      makePost("2026-05-20T10:00:00Z"),
      makePost("2026-05-25T10:00:00Z"),
    ];
    const s = buildBlock01Sample(posts);
    expect(s.observedPeriodDays).toBe(6); // 5 days span + 1
    expect(s.newestPostDateIso).toContain("2026-05-25");
    expect(s.oldestPostDateIso).toContain("2026-05-20");
  });

  it("drops date outliers > 180 days older than the recent cluster", () => {
    const posts = [
      makePost("2023-01-01T10:00:00Z"),
      makePost("2026-05-20T10:00:00Z"),
      makePost("2026-05-21T10:00:00Z"),
      makePost("2026-05-22T10:00:00Z"),
      makePost("2026-05-23T10:00:00Z"),
      makePost("2026-05-24T10:00:00Z"),
    ];
    const s = buildBlock01Sample(posts);
    expect(s.dateOutliersExcluded).toBeGreaterThanOrEqual(1);
    expect(s.observedPeriodDays).toBeLessThanOrEqual(31);
  });

  it("returns an empty sample for no posts", () => {
    const s = buildBlock01Sample([]);
    expect(s.totalReturnedPosts).toBe(0);
    expect(s.performancePosts).toHaveLength(0);
    expect(s.observedPeriodDays).toBe(0);
  });
});

describe("computeGlobalScore (interaction removed)", () => {
  it("uses 60/40 weights and no interaction term", async () => {
    const { computeGlobalScore } = await import(
      "@/components/report-redesign/v2/overview/score-utils"
    );
    // 60*0.6 + 40*0.4 = 36 + 16 = 52
    expect(computeGlobalScore(60, 40)).toBe(52);
    expect(computeGlobalScore(100, 100)).toBe(100);
    expect(computeGlobalScore(0, 0)).toBe(0);
  });
});

describe("Block 1 sample — avg likes/comments aligned with engagement rate (P1 #1)", () => {
  it("computePostAverages over performancePosts drops date outliers, pinned or not", async () => {
    const { computePostAverages } = await import("../post-aggregates");
    // 1 pinned (2023, likes 9999) + 1 stale outlier (2024, likes 9999)
    // + 3 recent posts with likes 10. Both old entries are dropped for
    // being date outliers — the pinned flag plays no part — so the
    // average stays 10.
    const posts: SnapshotPost[] = [
      {
        id: "pinned",
        taken_at: Math.floor(new Date("2023-01-01T10:00:00Z").getTime() / 1000),
        taken_at_iso: "2023-01-01T10:00:00Z",
        likes: 9999,
        comments: 9999,
        is_pinned: true,
        engagement_pct: 5,
        format: "Reels",
      },
      {
        id: "stale",
        taken_at: Math.floor(new Date("2024-06-01T10:00:00Z").getTime() / 1000),
        taken_at_iso: "2024-06-01T10:00:00Z",
        likes: 9999,
        comments: 9999,
        is_pinned: false,
        engagement_pct: 5,
        format: "Reels",
      },
      {
        id: "r1",
        taken_at: Math.floor(new Date("2026-05-20T10:00:00Z").getTime() / 1000),
        taken_at_iso: "2026-05-20T10:00:00Z",
        likes: 10,
        comments: 1,
        is_pinned: false,
        engagement_pct: 1,
        format: "Reels",
      },
      {
        id: "r2",
        taken_at: Math.floor(new Date("2026-05-22T10:00:00Z").getTime() / 1000),
        taken_at_iso: "2026-05-22T10:00:00Z",
        likes: 10,
        comments: 1,
        is_pinned: false,
        engagement_pct: 1,
        format: "Reels",
      },
      {
        id: "r3",
        taken_at: Math.floor(new Date("2026-05-24T10:00:00Z").getTime() / 1000),
        taken_at_iso: "2026-05-24T10:00:00Z",
        likes: 10,
        comments: 1,
        is_pinned: false,
        engagement_pct: 1,
        format: "Reels",
      },
    ];
    const sample = buildBlock01Sample(posts);
    expect(sample.pinnedPostsExcluded).toBe(0);
    // Stale 2024 post is > 180 days older than the May 2026 cluster.
    expect(sample.dateOutliersExcluded).toBeGreaterThanOrEqual(1);
    const avg = computePostAverages(sample.performancePosts, {
      excludePinned: false,
    });
    expect(avg).not.toBeNull();
    expect(avg!.averageLikes).toBe(10);
    expect(avg!.averageComments).toBe(1);
    expect(avg!.postsAnalyzed).toBe(3);
  });
});