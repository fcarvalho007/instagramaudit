/**
 * R4-A regression harness for `enrichPosts`.
 *
 * Verifies the new R4-A signals (video_duration, product_type, coauthors,
 * tagged_users, location_name, music_title, caption_length, is_pinned) are
 * mapped from the Apify shape AND that legacy/minimal posts continue to
 * normalize without throwing or producing junk.
 *
 * Pure: no I/O. Run with `bun src/lib/analysis/__tests__/normalize-r4a.test.ts`.
 * Each case asserts via `assert/strict`; failures exit with code 1.
 */

import assert from "node:assert/strict";

import { enrichPosts } from "../normalize";

// ─────────────────────────────────────────────────────────────────────────
// Fixture A — Apify "complete" Reel: every R4-A field populated.
// ─────────────────────────────────────────────────────────────────────────
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
  takenAtTimestamp: 1735603200, // 2024-12-31 00:00:00 UTC
  displayUrl: "https://example.com/thumb.jpg",
  coauthorProducers: [{ username: "marca_x" }, { username: "creator_y" }],
  taggedUsers: [{ username: "amigo_a" }, "amigo_b"],
  locationName: "Lisboa, Portugal",
  musicInfo: { song_name: "Track Name", artist_name: "Some Artist" },
};

// ─────────────────────────────────────────────────────────────────────────
// Fixture B — Apify "minimal/legacy" image post: NONE of the R4-A optional
// fields. Must normalize defensively (defaults, null, or 0 — never throw).
// ─────────────────────────────────────────────────────────────────────────
const fixtureLegacyImage = {
  shortcode: "C_legacy_002",
  type: "Image",
  caption: "post antigo simples",
  likesCount: 50,
  commentsCount: 3,
  takenAtTimestamp: 1700000000,
  displayUrl: "https://example.com/old.jpg",
};

// ─────────────────────────────────────────────────────────────────────────
// Fixture C — "Hybrid" carousel: has caption + tagged users but no music,
// no location, no coauthors, no duration. Stresses partial-presence logic.
// ─────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────
// Run cases
// ─────────────────────────────────────────────────────────────────────────
const followers = 10_000;
const { posts } = enrichPosts(
  [fixtureFullReel, fixtureLegacyImage, fixtureHybridCarousel],
  followers,
);

assert.equal(posts.length, 3, "should normalize all 3 fixtures");

// — Case A: full reel —
const a = posts[0];
assert.equal(a.format, "Reels", "fixture A should classify as Reels");
assert.equal(a.video_duration, 42.5, "video_duration must round-trip");
assert.equal(a.product_type, "clips", "product_type must round-trip");
assert.equal(a.is_pinned, true, "is_pinned must round-trip");
assert.deepEqual(
  a.coauthors,
  ["marca_x", "creator_y"],
  "coauthors must extract usernames",
);
assert.deepEqual(
  a.tagged_users,
  ["amigo_a", "amigo_b"],
  "tagged_users must accept object + string entries",
);
assert.equal(a.location_name, "Lisboa, Portugal", "location_name must round-trip");
assert.equal(
  a.music_title,
  "Track Name — Some Artist",
  "music_title must concatenate song + artist",
);
assert.equal(
  a.caption_length,
  fixtureFullReel.caption.length,
  "caption_length must equal caption.length",
);

// — Case B: legacy image —
const b = posts[1];
assert.equal(b.format, "Imagens", "fixture B should classify as Imagens");
assert.equal(b.video_duration ?? null, null, "legacy must have null video_duration");
assert.equal(b.is_pinned, false, "legacy is_pinned defaults to false");
assert.deepEqual(b.coauthors, [], "legacy coauthors defaults to []");
assert.deepEqual(b.tagged_users, [], "legacy tagged_users defaults to []");
assert.equal(b.location_name, null, "legacy location_name is null");
assert.equal(b.music_title, null, "legacy music_title is null");
assert.equal(
  b.caption_length,
  fixtureLegacyImage.caption.length,
  "legacy caption_length still derived from caption",
);

// — Case C: hybrid carousel —
const c = posts[2];
assert.equal(c.format, "Carrosséis", "fixture C should classify as Carrosséis");
assert.equal(c.product_type, "feed");
assert.deepEqual(c.tagged_users, ["convidado"]);
assert.deepEqual(c.coauthors, [], "hybrid: no coauthors");
assert.equal(c.location_name, null, "hybrid: no location");
assert.equal(c.music_title, null, "hybrid: no music");

console.log("✓ R4-A normalize fixtures pass (3/3)");