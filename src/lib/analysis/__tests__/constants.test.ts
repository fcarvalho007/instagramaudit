import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  APIFY_PUBLIC_DATA_CONTRACT,
  PUBLIC_INSTAGRAM_POSTS_LIMIT,
} from "@/lib/analysis/constants";
import { enrichPosts } from "@/lib/analysis/normalize";

describe("PUBLIC_INSTAGRAM_POSTS_LIMIT", () => {
  it("is exactly 12 (frozen contract)", () => {
    expect(PUBLIC_INSTAGRAM_POSTS_LIMIT).toBe(12);
  });

  it("is wired into the Apify actor input in analyze-public-v1", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/routes/api/analyze-public-v1.ts"),
      "utf8",
    );
    expect(src).toContain('from "@/lib/analysis/constants"');
    expect(src).toContain("resultsLimit: PUBLIC_INSTAGRAM_POSTS_LIMIT");
    // Defensive: ensure the old hardcoded duplicate is gone.
    expect(src).not.toMatch(/^const POSTS_LIMIT = 12;$/m);
  });

  it("caps enrichPosts at PUBLIC_INSTAGRAM_POSTS_LIMIT even with more raw posts", () => {
    const raw = Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`,
      shortcode: `code${i}`,
      likesCount: 10,
      commentsCount: 1,
      timestamp: new Date(2026, 0, i + 1).toISOString(),
      type: "Image",
    }));
    const { posts } = enrichPosts(raw, 1000);
    expect(posts).toHaveLength(PUBLIC_INSTAGRAM_POSTS_LIMIT);
  });
});

describe("APIFY_PUBLIC_DATA_CONTRACT", () => {
  it("lists core Apify-sourced fields", () => {
    for (const key of [
      "username",
      "followers_count",
      "caption",
      "is_pinned",
      "thumbnail_url",
    ]) {
      expect(APIFY_PUBLIC_DATA_CONTRACT.fields_from_apify).toContain(key);
    }
  });

  it("lists key derived metrics that do NOT come from Apify", () => {
    for (const key of [
      "engagement_rate",
      "weekly_cadence",
      "hashtags",
      "benchmark_positioning",
    ]) {
      expect(APIFY_PUBLIC_DATA_CONTRACT.derived_internally).toContain(key);
    }
  });

  it("documents what Instagram does not expose publicly", () => {
    for (const key of ["reach", "impressions", "saves"]) {
      expect(APIFY_PUBLIC_DATA_CONTRACT.not_available_publicly).toContain(key);
    }
  });
});