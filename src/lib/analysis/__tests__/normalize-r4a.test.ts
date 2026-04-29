/**
 * R4-A regression suite for `enrichPosts` (Vitest).
 *
 * Covers the new R4-A signals (video_duration, product_type, coauthors,
 * tagged_users, location_name, music_title, caption_length, is_pinned)
 * plus defensive normalization of legacy/minimal posts.
 *
 * Pure: no I/O, no provider calls.
 */

import { describe, it, expect } from "vitest";

import { enrichPosts } from "../normalize";

const fixtureFullReel = {
  shortcode: "C_full_001",
  type: "Video",
  productType: "clips",
  isVideo: true,
  videoDuration: 42.5,
  isPinned: true,
  caption: "Mini caso #marketing #ia @parceiro",
  likesCount: 320,
  commentsCount: 18,
  videoViewCount: 5400,
  takenAtTimestamp: 1735603200,
  displayUrl: "https://example.com/thumb.jpg",
  coauthorProducers: [{ username: "marca_x" }, { username: "creator_y" }],
  taggedUsers: [{ username: "amigo_a" }, "amigo_b"],
  locationName: "Lisboa, Portugal",
  musicInfo: { song_name: "Track Name", artist_name: "Some Artist" },
};

const fixtureLegacyImage = {
  shortcode: "C_legacy_002",
  type: "Image",
  caption: "post antigo simples",
  likesCount: 50,
  commentsCount: 3,
  takenAtTimestamp: 1700000000,
  displayUrl: "https://example.com/old.jpg",
};

const fixtureHybridCarousel = {
  shortcode: "C_hybrid_003",
  type: "Sidecar",
  productType: "feed",
  caption: "carrossel híbrido",
  likesCount: 120,
  commentsCount: 9,
  takenAtTimestamp: 1730000000,
  displayUrl: "https://example.com/carousel.jpg",
  taggedUsers: [{ username: "convidado" }],
};

describe("enrichPosts — R4-A signals", () => {
  const followers = 10_000;
  const { posts } = enrichPosts(
    [fixtureFullReel, fixtureLegacyImage, fixtureHybridCarousel],
    followers,
  );

  it("normalizes all fixtures without dropping any post", () => {
    expect(posts.length).toBe(3);
  });

  it("maps a full Apify Reel with every R4-A field populated", () => {
    const a = posts[0];
    expect(a.format).toBe("Reels");
    expect(a.video_duration).toBe(42.5);
    expect(a.product_type).toBe("clips");
    expect(a.is_pinned).toBe(true);
    expect(a.coauthors).toEqual(["marca_x", "creator_y"]);
    expect(a.tagged_users).toEqual(["amigo_a", "amigo_b"]);
    expect(a.location_name).toBe("Lisboa, Portugal");
    expect(a.music_title).toBe("Track Name · Some Artist");
    expect(a.caption_length).toBe(fixtureFullReel.caption.length);
  });

  it("normalizes a legacy minimal image post defensively", () => {
    const b = posts[1];
    expect(b.format).toBe("Imagens");
    expect(b.video_duration ?? null).toBe(null);
    expect(b.is_pinned).toBe(false);
    expect(b.coauthors).toEqual([]);
    expect(b.tagged_users).toEqual([]);
    expect(b.location_name).toBe(null);
    expect(b.music_title).toBe(null);
    expect(b.caption_length).toBe(fixtureLegacyImage.caption.length);
  });

  it("normalizes a hybrid carousel with partial fields", () => {
    const c = posts[2];
    expect(c.format).toBe("Carrosséis");
    expect(c.product_type).toBe("feed");
    expect(c.tagged_users).toEqual(["convidado"]);
    expect(c.coauthors).toEqual([]);
    expect(c.location_name).toBe(null);
    expect(c.music_title).toBe(null);
  });
});
