/**
 * Internal knowledge base for Instagram caption and hashtag interpretation.
 *
 * Used by report components and AI prompt builders to provide editorial
 * heuristics grounded in documented best-practice references.
 *
 * IMPORTANT: All data here comes from curated reference notes — no live
 * web fetching was performed to produce this file.
 */

export const INSTAGRAM_CAPTION_CONTEXT = {
  sources: [
    {
      name: "Castmagic",
      url: "https://www.castmagic.io/post/how-to-write-instagram-captions",
      visibility: "reference" as const,
    },
    {
      name: "Later",
      url: "https://later.com/blog/social-media-captions/",
      visibility: "reference" as const,
    },
    {
      name: "Shopify",
      url: "https://www.shopify.com/blog/instagram-captions",
      visibility: "reference" as const,
    },
  ],

  captionLength: {
    short: "<50 characters",
    medium: "50–150 characters",
    long: "150+ characters",
    source: "Shopify reference notes",
  },

  firstLineRule: {
    threshold: 125,
    description:
      "The first ~125 characters are especially important because they often appear before the 'more' truncation point.",
    source: "Castmagic, Later and Shopify reference notes",
  },

  hookTypes: [
    "question",
    "surprising fact",
    "emotion",
    "bold statement",
  ] as const,

  commentTriggers: [
    "question",
    "bold statement",
    "humour",
    "shared pain point",
  ] as const,

  valuePromotionRule: {
    value: 80,
    promotion: 20,
    description:
      "Use an 80/20 value-to-promotion balance as an editorial heuristic.",
    source: "Castmagic reference notes",
  },

  ctaQualitySignals: [
    "clarity over creativity",
    "one action per post",
    "direct next step",
  ] as const,

  commonIssues: [
    "generic phrases",
    "hashtag misuse",
    "brand voice inconsistency",
    "weak CTAs",
  ] as const,
} as const;

// ---------------------------------------------------------------------------
// Helper types
// ---------------------------------------------------------------------------

export type InstagramCaptionSource =
  (typeof INSTAGRAM_CAPTION_CONTEXT)["sources"][number];

export type HookType = (typeof INSTAGRAM_CAPTION_CONTEXT)["hookTypes"][number];

export type CommentTrigger =
  (typeof INSTAGRAM_CAPTION_CONTEXT)["commentTriggers"][number];