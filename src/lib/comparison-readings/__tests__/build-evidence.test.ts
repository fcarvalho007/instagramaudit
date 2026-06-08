import { describe, it, expect } from "vitest";
import {
  buildComparisonEvidence,
  hashEvidencePack,
} from "../build-evidence";

const basePayload = () => ({
  profile: {
    username: "alpha",
    full_name: "Alpha",
    followers: 10_000,
    verified: true,
    bio: "Bio here",
    external_urls: ["https://example.com"],
  },
  content_summary: {
    posts_analyzed: 12,
    engagement_rate: 3.5,
    posting_frequency_weekly: 2.1,
    average_likes: 100,
    average_comments: 4,
    dominant_format: "Reels",
    dominant_format_share: 60,
  },
  format_stats: {
    Reels: { sharePct: 60, count: 7 },
    Imagens: { sharePct: 40, count: 5 },
  },
  weekday_counts_iso: [0, 1, 2, 5, 1, 0, 0],
  top_hashtags: [{ tag: "fitness", uses: 4 }],
  posts: [
    { likes: 200, comments: 5, type: "reel", taken_at_iso: "2024-01-02" },
    { likes: 50, comments: 1, type: "image", taken_at_iso: "2024-01-01" },
  ],
  competitors: [
    {
      success: true,
      handle: "beta",
      profile: { username: "beta", followers: 20_000, verified: false, bio: "" },
      content_summary: {
        posts_analyzed: 10,
        engagement_rate: 2.0,
        posting_frequency_weekly: 3,
        average_likes: 80,
        average_comments: 2,
        dominant_format: "Carousels",
        dominant_format_share: 50,
      },
      format_stats: {
        Carousels: { sharePct: 50, count: 5 },
        Reels: { sharePct: 50, count: 5 },
      },
    },
  ],
});

describe("buildComparisonEvidence", () => {
  it("returns null when no competitor present", () => {
    expect(buildComparisonEvidence({ competitors: [] })).toBeNull();
  });

  it("returns null when competitor has success=false", () => {
    expect(
      buildComparisonEvidence({
        competitors: [{ success: false, handle: "x" }],
      }),
    ).toBeNull();
  });

  it("packs primary + competitor + deltas", () => {
    const pack = buildComparisonEvidence(basePayload());
    expect(pack).not.toBeNull();
    expect(pack!.primary.handle).toBe("alpha");
    expect(pack!.competitor.handle).toBe("beta");
    expect(pack!.primary.engagement_rate_pct).toBe(3.5);
    expect(pack!.deltas.engagement_rate_pp).toBe(1.5);
    expect(pack!.flags.has_format_stats_competitor).toBe(true);
    expect(pack!.primary.weekday_peak_iso).toBe(3); // index of value 5
  });

  it("never includes PII like emails or thumbnail URLs", () => {
    const pack = buildComparisonEvidence(basePayload());
    const serialized = JSON.stringify(pack);
    expect(serialized).not.toMatch(/@/);
    expect(serialized).not.toMatch(/thumbnail/i);
  });

  it("hashEvidencePack is stable for identical input", () => {
    const a = buildComparisonEvidence(basePayload())!;
    const b = buildComparisonEvidence(basePayload())!;
    expect(hashEvidencePack(a, "v1", "m")).toBe(hashEvidencePack(b, "v1", "m"));
  });

  it("hash changes when prompt_version changes", () => {
    const a = buildComparisonEvidence(basePayload())!;
    expect(hashEvidencePack(a, "v1", "m")).not.toBe(
      hashEvidencePack(a, "v2", "m"),
    );
  });
});