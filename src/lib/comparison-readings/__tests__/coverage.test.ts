import { describe, it, expect } from "vitest";
import { windowBounds, buildCoverage, matchingCompleteWindows } from "../coverage";
import { editorialEvidence, sampleEditorialPosts } from "../editorial-evidence";
describe("comparison coverage", () => {
  it("uses identical absolute boundaries and flags partial collection", () => {
    const b = windowBounds("30d", Date.parse("2026-09-10T12:00:00Z"));
    const a = buildCoverage([], b, 100, false);
    expect(a.status).toBe("complete");
    expect(matchingCompleteWindows(a, a)).toBe(true);
    expect(matchingCompleteWindows(a, { ...a, status: "partial" })).toBe(false);
    expect(buildCoverage([], b, 100, undefined).status).toBe("partial");
  });
  it("filters old pinned, future and undated posts from a dated window", () => {
    const b = windowBounds("30d", Date.parse("2026-09-10T12:00:00Z"));
    const raw = [
      { id: "old", is_pinned: true, taken_at_iso: "2025-01-01" },
      { id: "future", taken_at_iso: "2027-01-01" },
      { id: "missing" },
      { id: "ok", taken_at_iso: "2026-09-01", likes: 0, comments: 0, engagement_pct: 0 },
    ];
    const e = editorialEvidence(raw, b.startMs, b.endMs);
    expect(e.aggregates.eligible_posts).toBe(1);
    expect(e.aggregates.median_engagement_pct).toBe(0);
  });
  it("samples deterministically across time and performance while aggregating all posts", () => {
    const raw = Array.from({ length: 90 }, (_, i) => ({
      id: String(i),
      taken_at_iso: new Date(Date.UTC(2026, 6, i + 1)).toISOString(),
      likes: i,
      comments: 0,
      engagement_pct: i,
    }));
    const e = editorialEvidence(raw, null, null);
    expect(e.sampled_posts).toHaveLength(24);
    expect(e.aggregates.eligible_posts).toBe(90);
    expect(e.aggregates.median_engagement_pct).toBe(44.5);
    expect(editorialEvidence([...raw].reverse(), null, null)).toEqual(e);
  });
});
