/**
 * Snapshot adapter — pinned posts must remain visible in `topPosts` /
 * enriched.topPosts (with the `isPinned` flag) while staying out of the
 * temporal series / heatmap / best-days.
 */
import { describe, it, expect } from "vitest";
import {
  snapshotToReportData,
  type SnapshotPayload,
  type SnapshotPost,
} from "../snapshot-to-report-data";

function makePost(
  iso: string,
  opts: { pinned?: boolean; engagement?: number } = {},
): SnapshotPost {
  const t = new Date(iso).getTime();
  const d = new Date(iso);
  return {
    id: iso,
    shortcode: iso,
    permalink: `https://instagram.com/p/${iso}`,
    format: "Reels",
    caption: "teste",
    hashtags: [],
    mentions: [],
    taken_at: Math.floor(t / 1000),
    taken_at_iso: iso,
    weekday: d.getUTCDay(),
    hour_local: d.getUTCHours(),
    likes: 100,
    comments: 10,
    video_views: 0,
    is_video: true,
    is_pinned: opts.pinned ?? false,
    engagement_pct: opts.engagement ?? 0.5,
  };
}

describe("snapshotToReportData — pinned exposure in topPosts", () => {
  it("keeps pinned in top posts with isPinned=true when engagement wins", () => {
    const posts: SnapshotPost[] = [
      // 2 pinned with very high engagement
      makePost("2023-05-11T18:00:00.000Z", { pinned: true, engagement: 9.5 }),
      makePost("2023-09-05T19:00:00.000Z", { pinned: true, engagement: 8.0 }),
      // 5 recent with moderate engagement
      makePost("2026-05-25T08:00:00.000Z", { engagement: 1.2 }),
      makePost("2026-05-21T15:00:00.000Z", { engagement: 0.9 }),
      makePost("2026-05-20T10:00:00.000Z", { engagement: 0.7 }),
      makePost("2026-05-18T09:00:00.000Z", { engagement: 0.6 }),
      makePost("2026-05-16T15:00:00.000Z", { engagement: 0.5 }),
    ];
    const payload: SnapshotPayload = { posts };
    const { data, enriched } = snapshotToReportData({ payload });

    // Pinned posts win the top slots and carry the flag.
    const dataTop = data.topPosts[0] as typeof data.topPosts[number] & {
      isPinned?: boolean;
    };
    expect(dataTop.isPinned).toBe(true);
    expect(enriched.topPosts[0].isPinned).toBe(true);
    // At least one of the top three is pinned.
    expect(enriched.topPosts.slice(0, 3).some((p) => p.isPinned)).toBe(true);
  });

  it("does NOT leak 2023 pinned dates into temporalSeries / bestDays", () => {
    const posts: SnapshotPost[] = [
      makePost("2023-05-11T18:00:00.000Z", { pinned: true, engagement: 9.5 }),
      makePost("2023-09-05T19:00:00.000Z", { pinned: true, engagement: 8.0 }),
      makePost("2026-05-25T08:00:00.000Z", { engagement: 1.2 }),
      makePost("2026-05-21T15:00:00.000Z", { engagement: 0.9 }),
      makePost("2026-05-20T10:00:00.000Z", { engagement: 0.7 }),
      makePost("2026-05-18T09:00:00.000Z", { engagement: 0.6 }),
      makePost("2026-05-16T15:00:00.000Z", { engagement: 0.5 }),
    ];
    const { data } = snapshotToReportData({ payload: { posts } });

    // Temporal series should only contain May 2026 dates, never 2023.
    expect(data.temporalSeries.length).toBeGreaterThan(0);
    for (const point of data.temporalSeries) {
      expect(point.isoDate.startsWith("2026-")).toBe(true);
    }

    // bestDays leader is computed only from non-pinned posts (engagement
    // of pinned 9.5/8.0 must not crown its day-of-week as leader if no
    // recent post falls on the same weekday).
    const leader = data.bestDays.find((d) => d.isLeader);
    expect(leader).toBeDefined();
    expect(leader!.avgEngagement).toBeLessThan(2); // pinned values excluded
  });
});