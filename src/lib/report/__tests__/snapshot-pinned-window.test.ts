/**
 * Window/cadence regression — pinned posts must not inflate the time window.
 *
 * Real bug: @robs.cortez had 12 posts; 2 of them pinned from 2023 and 10
 * fresh from May 2026. The report showed "12 publicações em 1111 dias" with
 * a cadence of ~0,1 posts/semana, even though the live cadence is ~5-6/week.
 */
import { describe, it, expect } from "vitest";
import {
  snapshotToReportData,
  type SnapshotPayload,
  type SnapshotPost,
} from "../snapshot-to-report-data";

function makePost(
  iso: string,
  opts: { pinned?: boolean; likes?: number } = {},
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
    likes: opts.likes ?? 50,
    comments: 5,
    video_views: 0,
    is_video: true,
    is_pinned: opts.pinned ?? false,
    engagement_pct: 0.5,
  };
}

describe("snapshotToReportData — pinned posts excluded from cadence window", () => {
  it("ignores pinned posts when computing windowDays and weekly frequency", () => {
    // 2 pinned from 2023 + 10 fresh in May 2026 (12-day live window).
    const posts: SnapshotPost[] = [
      makePost("2023-05-11T18:18:10.000Z", { pinned: true }),
      makePost("2023-09-05T19:22:49.000Z", { pinned: true }),
      makePost("2026-05-13T17:53:55.000Z"),
      makePost("2026-05-13T19:31:29.000Z"),
      makePost("2026-05-14T09:59:20.000Z"),
      makePost("2026-05-15T13:42:55.000Z"),
      makePost("2026-05-16T15:10:24.000Z"),
      makePost("2026-05-18T09:00:09.000Z"),
      makePost("2026-05-20T10:01:55.000Z"),
      makePost("2026-05-21T11:00:00.000Z"),
      makePost("2026-05-21T15:30:34.000Z"),
      makePost("2026-05-25T08:06:41.000Z"),
    ];

    const payload: SnapshotPayload = {
      profile: {
        username: "robs.cortez",
        followers_count: 5000,
        following_count: 100,
        media_count: 200,
      } as never,
      posts,
    };

    const { data } = snapshotToReportData({ payload });

    // Live window: 2026-05-13 → 2026-05-25 = 13 calendar days inclusive.
    expect(data.profile.windowDays).toBe(13);

    // Cadence: 10 non-pinned / 13 days × 7 ≈ 5.4 posts/week.
    expect(data.keyMetrics.postingFrequencyWeekly).toBeGreaterThanOrEqual(5);
    expect(data.keyMetrics.postingFrequencyWeekly).toBeLessThanOrEqual(6);
  });

  it("falls back to all posts when every post is pinned", () => {
    const posts: SnapshotPost[] = [
      makePost("2026-05-20T10:00:00.000Z", { pinned: true }),
      makePost("2026-05-22T10:00:00.000Z", { pinned: true }),
    ];
    const { data } = snapshotToReportData({ payload: { posts } });
    expect(data.profile.windowDays).toBe(3);
  });
});