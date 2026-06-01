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
  it("excludes pinned posts from performance + cadence", () => {
    const posts = [
      makePost("2026-05-20T10:00:00Z", { pinned: true }),
      makePost("2026-05-21T10:00:00Z"),
      makePost("2026-05-22T10:00:00Z"),
      makePost("2026-05-23T10:00:00Z"),
    ];
    const s = buildBlock01Sample(posts);
    expect(s.pinnedPostsExcluded).toBe(1);
    expect(s.analyzedPosts).toHaveLength(3);
    expect(s.performancePosts).toHaveLength(3);
    expect(s.cadencePosts).toHaveLength(3);
  });

  it("falls back to all posts when every post is pinned", () => {
    const posts = [
      makePost("2026-05-20T10:00:00Z", { pinned: true }),
      makePost("2026-05-22T10:00:00Z", { pinned: true }),
    ];
    const s = buildBlock01Sample(posts);
    expect(s.analyzedPosts).toHaveLength(2);
    expect(s.pinnedPostsExcluded).toBe(2);
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