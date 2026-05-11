import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildReportSnapshotPayload } from "../build-report-snapshot-payload.server";

function baseSource() {
  return {
    profile: {
      username: "frederico.m.carvalho",
      display_name: "Frederico",
      followers_count: 1234,
      avatar_url: "https://cdn.instagram.com/avatar.jpg",
    },
    metrics: { engagement_pct: 2.34 },
    format_stats: { reel: 12 },
    content_summary: { topics: ["a"] },
    posts: [
      {
        id: "p1",
        caption: "olá",
        thumbnail_url: "https://cdn.instagram.com/p1.jpg",
        likes: 10,
      },
    ],
    insights: { summary: "ok" },
    data_provenance: { apify_actor: "apify/instagram-profile-scraper" },
    // heavy fields that MUST be excluded:
    caption_semantic_analysis: { foo: "x".repeat(5000) },
    visual_cover_analysis: { bar: "y".repeat(5000) },
    ai_insights_v1: { legacy: true },
    market_signals_free: { dfs: "z".repeat(10000) },
    enrichment_status: { running: true },
  };
}

describe("buildReportSnapshotPayload", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("inclui apenas campos whitelisted", () => {
    const { payload } = buildReportSnapshotPayload({
      normalized_payload: baseSource(),
      instagram_username: "frederico.m.carvalho",
      competitor_usernames: ["a", "b"],
    });

    expect(payload.profile.username).toBe("frederico.m.carvalho");
    expect(payload.metrics).toEqual({ engagement_pct: 2.34 });
    expect(payload.posts).toHaveLength(1);
    expect(payload.competitors).toEqual(["a", "b"]);

    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("caption_semantic_analysis");
    expect(serialized).not.toContain("visual_cover_analysis");
    expect(serialized).not.toContain("ai_insights_v1");
    expect(serialized).not.toContain("market_signals_free");
    expect(serialized).not.toContain("enrichment_status");
  });

  it("rejeita avatar base64 e regista warning", () => {
    const src = baseSource();
    src.profile.avatar_url = "data:image/png;base64,AAAA";
    const warn = vi.spyOn(console, "warn");
    const { payload } = buildReportSnapshotPayload({
      normalized_payload: src,
      instagram_username: "x",
      competitor_usernames: [],
    });
    expect(payload.profile.avatar_url).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("rejeita thumbnails base64 nos posts", () => {
    const src = baseSource();
    src.posts[0].thumbnail_url = "data:image/jpeg;base64,ZZZZ";
    const { payload } = buildReportSnapshotPayload({
      normalized_payload: src,
      instagram_username: "x",
      competitor_usernames: [],
    });
    expect(payload.posts[0].thumbnail_url).toBeNull();
  });

  it("trunca captions longas a 1000 chars", () => {
    const src = baseSource();
    src.posts[0].caption = "a".repeat(5000);
    const { payload } = buildReportSnapshotPayload({
      normalized_payload: src,
      instagram_username: "x",
      competitor_usernames: [],
    });
    expect(payload.posts[0].caption?.length).toBe(1000);
    expect(payload.posts[0].caption_length).toBe(5000);
  });

  it("limita posts a 30", () => {
    const src = baseSource();
    src.posts = Array.from({ length: 50 }, (_, i) => ({
      id: `p${i}`,
      caption: "x",
    })) as never;
    const { payload } = buildReportSnapshotPayload({
      normalized_payload: src,
      instagram_username: "x",
      competitor_usernames: [],
    });
    expect(payload.posts).toHaveLength(30);
  });

  it("devolve schema_version e algorithm_version", () => {
    const result = buildReportSnapshotPayload({
      normalized_payload: baseSource(),
      instagram_username: "x",
      competitor_usernames: [],
      algorithm_version: "analysis.v9",
    });
    expect(result.payload_schema_version).toBe("report.v1");
    expect(result.algorithm_version).toBe("analysis.v9");
    expect(result.payload.schema_version).toBe("report.v1");
  });
});