import { describe, it, expect } from "vitest";
import { canonicalFixture } from "./fixtures";
import { buildComparisonEvidence,
  hashEvidencePack } from "../build-evidence";

describe("canonical comparison evidence", () => {
  it("retains normalized fields on both sides", () => {
    const raw = canonicalFixture();
    const pack = buildComparisonEvidence(raw)!;
    expect(pack.primary.followers).toBe(1000);
    expect(pack.competitor.followers).toBe(2000);
    expect(pack.primary.full_name).toBe("alpha");
    expect(pack.primary.verified).toBe(false);
    expect(pack.primary.engagement_rate_pct).toBe(raw.content_summary.average_engagement_rate);
    expect(pack.deltas.engagement_rate_pp).toBe(0.6);
    expect(pack.primary.posting_frequency_weekly).toBe(2.8);
    expect(pack.competitor.top_post_metrics).toHaveLength(3);
    expect(pack.competitor.top_post_metrics[0].permalink).toMatch(
      /^https:\/\/www.instagram.com\/p\//,
    );
    expect(pack.competitor.top_hashtags).toContainEqual({ tag: "exemplo", uses: 12 });
    expect(pack.competitor.weekday_counts_iso?.reduce((a, b) => a + b, 0)).toBe(12);
    expect(pack.primary.format_mix.reduce((n, f) => n + (f.count ?? 0), 0)).toBe(12);
  });
  it("preserves observed zero, missing metrics and unusable competitors", () => {
    const raw = canonicalFixture();
    raw.content_summary.average_engagement_rate = 0;
    expect(buildComparisonEvidence(raw)!.primary.engagement_rate_pct).toBe(0);
    expect(
      buildComparisonEvidence({
  profile: {},
  competitors: [
    {
      success: true, profile: { username: "b" } }],
})!.competitor.followers,
    ).toBeNull();
    expect(buildComparisonEvidence({ competitors: [{ success: false }] })).toBeNull();
    expect(buildComparisonEvidence({ competitors: [] })).toBeNull();
  });

  it("keeps the second competitor independent and hashes reproducibly", () => {
    const raw = canonicalFixture();
    const a = buildComparisonEvidence(raw)!;
    const b = buildComparisonEvidence(raw, 1)!;
    expect(b.competitor.handle).toBe("gamma");
    expect(hashEvidencePack(a, "v2", "m")).toBe(hashEvidencePack(buildComparisonEvidence(raw)!, "v2", "m"),
    );
    expect(hashEvidencePack(a, "v2", "m")).not.toBe(
      hashEvidencePack(b, "v2", "m"));
  });
  it("does not invent a current cadence for old undated snapshots", () => {
    const { analysis_window_end: _end, ...raw } = canonicalFixture();
    expect(buildComparisonEvidence(raw)!.primary.posting_frequency_weekly).toBeNull();
  });
});
