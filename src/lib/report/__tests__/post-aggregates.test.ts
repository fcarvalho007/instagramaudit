import { describe, it, expect } from "vitest";
import { computePostAverages } from "@/lib/report/post-aggregates";
import { classifyAudienceResponse } from "@/lib/report/block02-diagnostic";
import type { SnapshotPost } from "@/lib/report/snapshot-to-report-data";

// Real snapshot lg_portugal (12 posts, 5 total comments → avg 0.4166…)
const LG_POSTS: SnapshotPost[] = [
  { likes: 20, comments: 2 },
  { likes: 11, comments: 2 },
  { likes: 14, comments: 0 },
  { likes: 23, comments: 0 },
  { likes: 41, comments: 0 },
  { likes: 26, comments: 0 },
  { likes: 26, comments: 0 },
  { likes: 67, comments: 1 },
  { likes: 20, comments: 0 },
  { likes: 13, comments: 0 },
  { likes: 33, comments: 0 },
  { likes: 38, comments: 0 },
];

describe("computePostAverages", () => {
  it("returns 0.4166… (not 0) for the lg_portugal snapshot", () => {
    const avg = computePostAverages(LG_POSTS);
    expect(avg).not.toBeNull();
    expect(avg!.averageComments).toBeCloseTo(5 / 12, 4);
    expect(avg!.averageLikes).toBeCloseTo(332 / 12, 4);
    expect(avg!.postsAnalyzed).toBe(12);
  });

  it("returns null for empty or missing posts", () => {
    expect(computePostAverages(null)).toBeNull();
    expect(computePostAverages(undefined)).toBeNull();
    expect(computePostAverages([])).toBeNull();
  });

  it("matches the avgComments produced by classifyAudienceResponse (P05)", () => {
    const overview = computePostAverages(LG_POSTS)!;
    const p05 = classifyAudienceResponse(LG_POSTS as never);
    expect(p05.avgComments).toBeCloseTo(overview.averageComments, 4);
  });
});