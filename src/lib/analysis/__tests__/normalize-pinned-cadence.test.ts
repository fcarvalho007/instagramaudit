import { describe, expect, it } from "vitest";

import { enrichPosts } from "@/lib/analysis/normalize";

/**
 * Guard test: pinned posts must survive normalization with hashtags,
 * caption and `is_pinned: true`. Their exclusion from posting cadence
 * happens later in `snapshot-to-report-data` (covered by
 * `snapshot-pinned-toppost.test.ts`); this test exists so that future
 * edits to normalization don't accidentally strip pinned posts upstream.
 */
describe("enrichPosts — pinned posts preservation", () => {
  it("keeps pinned posts and extracts hashtags/captions", () => {
    const raw = [
      {
        id: "pinned-1",
        shortcode: "AAA111",
        caption: "Lançamento #marca @parceiro",
        likesCount: 9000,
        commentsCount: 200,
        timestamp: "2023-05-11T18:00:00.000Z",
        isPinned: true,
        type: "Image",
      },
      {
        id: "recent-1",
        shortcode: "BBB222",
        caption: "Hoje #dica",
        likesCount: 100,
        commentsCount: 5,
        timestamp: "2026-05-20T10:00:00.000Z",
        type: "Image",
      },
    ];

    const { posts } = enrichPosts(raw, 50_000);

    expect(posts).toHaveLength(2);
    const pinned = posts.find((p) => p.id === "pinned-1")!;
    expect(pinned.is_pinned).toBe(true);
    expect(pinned.hashtags).toContain("marca");
    expect(pinned.mentions).toContain("parceiro");
    expect(pinned.caption).toContain("Lançamento");
  });
});