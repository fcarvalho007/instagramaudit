import { describe, it, expect } from "vitest";
import {
  PAID_SNAPSHOT_FIELDS,
  sanitizeSnapshotForAccessLevel,
} from "../sanitize-snapshot";

function buildPayload() {
  return {
    profile: { username: "x", followers_count: 100 },
    content_summary: { average_engagement_rate: 0.02 },
    format_stats: { reel: { count: 5 } },
    posts: [
      {
        id: "1",
        thumbnail_url: "https://cdn.example/post.jpg",
        thumbnail_storage_url: "https://storage.example/post.jpg",
      },
    ],
    competitors: [],
    enrichment_status: { visual_cover: "pending" },
    ai_insights_v1: { insights: [{ id: "a" }] },
    ai_insights_v2: { sections: { overview: { text: "x" } } },
    visual_cover_analysis: { covers: [] },
    caption_semantic_analysis: { themes: [] },
    comment_intelligence: { topics: [] },
    market_signals_free: { foo: 1 },
    market_signals_paid: { bar: 2 },
  } as Record<string, unknown>;
}

describe("sanitizeSnapshotForAccessLevel", () => {
  it("strips all paid fields for free callers", () => {
    const input = buildPayload();
    const out = sanitizeSnapshotForAccessLevel(input, "free");
    for (const key of PAID_SNAPSHOT_FIELDS) {
      expect(out).not.toHaveProperty(key);
    }
    // Free-safe fields survive.
    expect(out).toHaveProperty("profile");
    expect(out).toHaveProperty("content_summary");
    expect(out).toHaveProperty("format_stats");
    expect(out).toHaveProperty("posts");
    expect(out.posts).toEqual([
      {
        id: "1",
        thumbnail_url: "https://cdn.example/post.jpg",
        thumbnail_storage_url: "https://storage.example/post.jpg",
      },
    ]);
    expect(out).toHaveProperty("competitors");
    expect(out).toHaveProperty("enrichment_status");
  });

  it("keeps only comment intelligence for identified leads", () => {
    const input = buildPayload();
    const out = sanitizeSnapshotForAccessLevel(input, "lead");
    expect(out).toHaveProperty("comment_intelligence");
    expect(out.posts).toEqual([
      {
        id: "1",
        thumbnail_url: "https://cdn.example/post.jpg",
        thumbnail_storage_url: "https://storage.example/post.jpg",
      },
    ]);
    for (const key of PAID_SNAPSHOT_FIELDS) {
      if (key === "comment_intelligence") continue;
      expect(out).not.toHaveProperty(key);
    }
  });


  it("returns the payload unchanged for pro callers", () => {
    const input = buildPayload();
    const out = sanitizeSnapshotForAccessLevel(input, "pro");
    expect(out).toBe(input);
    for (const key of PAID_SNAPSHOT_FIELDS) {
      expect(out).toHaveProperty(key);
    }
  });

  it("returns the payload unchanged for internal_lab callers", () => {
    const input = buildPayload();
    const out = sanitizeSnapshotForAccessLevel(input, "internal_lab");
    expect(out).toBe(input);
    for (const key of PAID_SNAPSHOT_FIELDS) {
      expect(out).toHaveProperty(key);
    }
  });

  it("does not mutate the original payload when scrubbing", () => {
    const input = buildPayload();
    sanitizeSnapshotForAccessLevel(input, "free");
    for (const key of PAID_SNAPSHOT_FIELDS) {
      expect(input).toHaveProperty(key);
    }
  });

  it("does not throw when paid fields are absent", () => {
    const minimal = { profile: { username: "y" } } as Record<string, unknown>;
    expect(() => sanitizeSnapshotForAccessLevel(minimal, "free")).not.toThrow();
    const out = sanitizeSnapshotForAccessLevel(minimal, "free");
    expect(out).toEqual({ profile: { username: "y" } });
  });
});