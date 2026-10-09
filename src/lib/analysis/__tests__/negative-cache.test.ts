import { describe, expect, it } from "vitest";

import { isNegativeCacheHit, notFoundCode } from "@/lib/analysis/negative-cache";

const NOW = Date.parse("2026-10-09T20:00:00Z");
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

describe("negative cache", () => {
  it("replays an empty result within 15 minutes", () => {
    expect(isNegativeCacheHit("PROFILE_UNREADABLE", minutesAgo(10), NOW)).toBe(true);
    expect(isNegativeCacheHit("PROFILE_NOT_FOUND", minutesAgo(14), NOW)).toBe(true);
  });

  it("expires an empty result after 15 minutes", () => {
    expect(isNegativeCacheHit("PROFILE_UNREADABLE", minutesAgo(16), NOW)).toBe(false);
    expect(isNegativeCacheHit("PROFILE_NOT_FOUND", minutesAgo(16), NOW)).toBe(false);
  });

  it("keeps private / personal-no-feed for 24 hours", () => {
    expect(isNegativeCacheHit("PROFILE_PRIVATE", minutesAgo(23 * 60), NOW)).toBe(true);
    expect(isNegativeCacheHit("PROFILE_PERSONAL_NO_FEED", minutesAgo(25 * 60), NOW)).toBe(false);
  });

  it("keeps a restricted profile for 24 hours", () => {
    expect(isNegativeCacheHit("PROFILE_RESTRICTED", minutesAgo(23 * 60), NOW)).toBe(true);
    expect(isNegativeCacheHit("PROFILE_RESTRICTED", minutesAgo(25 * 60), NOW)).toBe(false);
  });

  it("ignores unrelated codes", () => {
    expect(isNegativeCacheHit("UPSTREAM_FAILED", minutesAgo(1), NOW)).toBe(false);
  });
});

describe("notFoundCode", () => {
  it("only says not found when the primary provider answered", () => {
    expect(notFoundCode(false)).toBe("PROFILE_NOT_FOUND");
    expect(notFoundCode(true)).toBe("PROFILE_UNREADABLE");
  });

  it("reports a restricted profile as restricted, never as not found", () => {
    expect(notFoundCode(false, true)).toBe("PROFILE_RESTRICTED");
    expect(notFoundCode(true, true)).toBe("PROFILE_RESTRICTED");
  });
});
