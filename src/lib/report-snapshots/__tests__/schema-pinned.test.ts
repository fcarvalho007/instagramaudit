/**
 * Regression — ReportPayloadV1Schema must preserve `is_pinned` so the
 * downstream cadence calculation can filter pinned posts out of the
 * window. Bug: schema stripped the flag, and `report_snapshots`-backed
 * reports showed "12 publicações em 1111 dias" for @robs.cortez.
 */
import { describe, it, expect } from "vitest";
import { ReportPayloadV1Schema } from "../schema";
import { snapshotToReportData } from "../../report/snapshot-to-report-data";

function post(iso: string, pinned = false) {
  return {
    id: iso,
    shortcode: iso,
    permalink: `https://instagram.com/p/${iso}`,
    format: "Reels",
    taken_at_iso: iso,
    caption: "x",
    hashtags: [],
    mentions: [],
    likes: 100,
    comments: 10,
    video_views: 0,
    engagement_pct: 0.5,
    is_pinned: pinned,
  };
}

describe("ReportPayloadV1Schema — preserves is_pinned", () => {
  const recent = [
    "2026-05-25T08:00:00.000Z",
    "2026-05-21T15:00:00.000Z",
    "2026-05-21T11:00:00.000Z",
    "2026-05-20T10:00:00.000Z",
    "2026-05-18T09:00:00.000Z",
    "2026-05-16T15:00:00.000Z",
    "2026-05-15T13:00:00.000Z",
    "2026-05-14T09:00:00.000Z",
    "2026-05-13T19:00:00.000Z",
    "2026-05-13T17:00:00.000Z",
  ];
  const payload = {
    schema_version: "report.v1" as const,
    algorithm_version: "analysis.v1",
    generated_at: "2026-05-25T16:00:00.000Z",
    handle: "robs.cortez",
    network: "instagram",
    competitors: [],
    language: "pt-PT",
    profile: {
      username: "robs.cortez",
      followers_count: 32314,
      following_count: 603,
      posts_count: 762,
    },
    metrics: {},
    posts: [
      post("2023-09-05T19:22:49.000Z", true),
      post("2023-05-11T18:18:10.000Z", true),
      ...recent.map((iso) => post(iso, false)),
    ],
  };

  it("keeps is_pinned through Zod validation", () => {
    const parsed = ReportPayloadV1Schema.parse(payload);
    const pinnedCount = parsed.posts.filter((p) => p.is_pinned).length;
    expect(pinnedCount).toBe(2);
  });

  it("yields realistic cadence after pinned filter", () => {
    const parsed = ReportPayloadV1Schema.parse(payload);
    const { data } = snapshotToReportData({
      payload: parsed as unknown as Parameters<typeof snapshotToReportData>[0]["payload"],
    });
    expect(data.profile.windowDays).toBeLessThanOrEqual(20);
    expect(data.profile.windowDays).toBeGreaterThanOrEqual(10);
    expect(data.keyMetrics.postingFrequencyWeekly).toBeGreaterThanOrEqual(3);
  });
});