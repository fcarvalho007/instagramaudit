import { describe, it, expect } from "vitest";
import {
  snapshotToReportData,
  type SnapshotPayload,
  type SnapshotPost,
} from "../snapshot-to-report-data";

function makePost(daysAgo: number): SnapshotPost {
  const t = Date.now() - daysAgo * 24 * 3_600_000;
  return {
    id: `p-${daysAgo}`,
    taken_at: Math.floor(t / 1000),
    taken_at_iso: new Date(t).toISOString(),
    likes: 100,
    comments: 10,
    is_pinned: false,
    engagement_pct: 1.5,
    format: "Reels",
  };
}

function basePayload(
  override: Partial<SnapshotPayload> = {},
): SnapshotPayload {
  const posts = [makePost(2), makePost(8), makePost(15), makePost(22)];
  return {
    profile: {
      username: "frederico.m.carvalho",
      display_name: "Frederico",
      followers_count: 5000,
      following_count: 100,
      posts_count: 200,
      is_verified: false,
    },
    content_summary: {
      posts_analyzed: posts.length,
      dominant_format: "Reels",
      average_likes: 100,
      average_comments: 10,
      average_engagement_rate: 1.5,
      estimated_posts_per_week: 2,
    },
    format_stats: { Reels: { count: posts.length, share_pct: 100, avg_engagement_pct: 1.5 } },
    posts,
    ...override,
  };
}

describe("snapshotToReportData — analysis_window meta (PR2)", () => {
  it("baseline-legacy (no key) → no window override, analysisWindow=baseline", () => {
    const { data } = snapshotToReportData({ payload: basePayload() });
    expect(data.meta.analysisWindow).toBe("baseline");
    // Baseline uses cadence-derived copy ("últimas N publicações recolhidas"),
    // never the wide-window override pattern ("dos últimos N dias.") nor the
    // deterministic empty-window line.
    expect(data.meta.sampleCaption ?? "").not.toMatch(/dos últimos \d+ dias\.$/);
    expect(data.meta.sampleCaption ?? "").not.toMatch(/^Sem publicações/);
  });

  it("baseline-explicit → byte-compat with legacy", () => {
    const legacy = snapshotToReportData({ payload: basePayload() }).data.meta;
    const explicit = snapshotToReportData({
      payload: basePayload({ analysis_window: "baseline" }),
    }).data.meta;
    expect(explicit.windowLabel).toBe(legacy.windowLabel);
    expect(explicit.sampleCaption).toBe(legacy.sampleCaption);
    expect(explicit.analysisWindow).toBe("baseline");
  });

  it("30d → forces 'Últimos 30 dias' copy across all meta fields", () => {
    const { data } = snapshotToReportData({
      payload: basePayload({ analysis_window: "30d", analysis_window_label: "Últimos 30 dias" }),
    });
    expect(data.meta.analysisWindow).toBe("30d");
    expect(data.meta.windowLabel).toBe("últimos 30 dias");
    expect(data.meta.windowShortLabel).toBe("30 dias");
    expect(data.meta.kpiSubtitle).toMatch(/nos últimos 30 dias$/);
    expect(data.meta.sampleCaption).toMatch(/dos últimos 30 dias\.$/);
    expect(data.meta.temporalLabel).toBe("Evolução temporal · últimos 30 dias");
    expect(data.meta.topPostsSubtitle).toMatch(/últimos 30 dias/);
  });

  it("90d → forces 'Últimos 90 dias' copy", () => {
    const { data } = snapshotToReportData({
      payload: basePayload({ analysis_window: "90d" }),
    });
    expect(data.meta.analysisWindow).toBe("90d");
    expect(data.meta.windowLabel).toBe("últimos 90 dias");
    expect(data.meta.windowShortLabel).toBe("90 dias");
    expect(data.meta.temporalLabel).toBe("Evolução temporal · últimos 90 dias");
  });

  it("30d empty feed → deterministic 'Sem publicações nos últimos 30 dias.'", () => {
    const { data } = snapshotToReportData({
      payload: basePayload({
        analysis_window: "30d",
        posts: [],
        content_summary: {
          posts_analyzed: 0,
          dominant_format: null,
          average_likes: 0,
          average_comments: 0,
          average_engagement_rate: 0,
          estimated_posts_per_week: 0,
        },
        format_stats: {},
      }),
    });
    expect(data.meta.analysisWindow).toBe("30d");
    expect(data.meta.sampleCaption).toBe("Sem publicações nos últimos 30 dias.");
    expect(data.meta.kpiSubtitle).toBe("sem publicações nos últimos 30 dias");
  });

  it("90d empty feed → deterministic 'Sem publicações nos últimos 90 dias.'", () => {
    const { data } = snapshotToReportData({
      payload: basePayload({
        analysis_window: "90d",
        posts: [],
        content_summary: {
          posts_analyzed: 0,
          dominant_format: null,
          average_likes: 0,
          average_comments: 0,
          average_engagement_rate: 0,
          estimated_posts_per_week: 0,
        },
        format_stats: {},
      }),
    });
    expect(data.meta.sampleCaption).toBe("Sem publicações nos últimos 90 dias.");
  });
});