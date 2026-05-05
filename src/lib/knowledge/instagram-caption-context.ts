/**
 * Internal knowledge base for Instagram caption, CTA and hashtag
 * interpretation.
 *
 * Used by report cards, AI prompt context, caption diagnostics and
 * hashtag diagnostics to provide editorial heuristics grounded in
 * documented best-practice references.
 *
 * IMPORTANT: All data here comes from curated reference notes — no live
 * web fetching was performed to produce this file. Source URLs are stored
 * as editorial references only.
 */

export const INSTAGRAM_CAPTION_CONTEXT = {
  // ─────────────────────────────────────────────────────────────────────
  // Sources
  // ─────────────────────────────────────────────────────────────────────
  sources: [
    {
      name: "Later",
      url: "https://later.com/blog/social-media-captions/",
      role: "caption writing, hooks, CTAs, conversation triggers",
    },
    {
      name: "Shopify",
      url: "https://www.shopify.com/blog/instagram-captions",
      role: "caption length, first sentence, CTAs, hashtags, ecommerce-oriented captions",
    },
    {
      name: "Castmagic",
      url: "https://www.castmagic.io/post/how-to-write-instagram-captions",
      role: "hook types, caption structure, AI-assisted caption workflows, common mistakes",
    },
  ],

  // ─────────────────────────────────────────────────────────────────────
  // Caption length buckets
  // ─────────────────────────────────────────────────────────────────────
  captionLength: {
    short: {
      maxCharacters: 50,
      description:
        "Short captions are useful for punchy one-liners, quick reactions or simple CTAs.",
    },
    medium: {
      minCharacters: 50,
      maxCharacters: 150,
      description:
        "Medium captions are useful for context, emotion or concise explanation.",
    },
    long: {
      minCharacters: 150,
      description:
        "Long captions are useful for storytelling, tutorials, founder notes or educational posts.",
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // First-line rule
  // ─────────────────────────────────────────────────────────────────────
  firstLineRule: {
    thresholdCharacters: 125,
    description:
      "The first ~125 characters are especially important because they often appear before the 'more' truncation point. The first sentence should clarify value, emotion or curiosity.",
  },

  // ─────────────────────────────────────────────────────────────────────
  // Goal per post
  // ─────────────────────────────────────────────────────────────────────
  goalPerPost: {
    description:
      "Each post should have one main communication goal. The caption should support that goal instead of trying to drive multiple actions at once.",
    possibleGoals: [
      "generate comments",
      "drive saves",
      "drive shares",
      "send traffic to link in bio",
      "promote a product or offer",
      "educate",
      "build trust",
      "create community",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // Hook types
  // ─────────────────────────────────────────────────────────────────────
  hookTypes: [
    {
      type: "question",
      description:
        "Opens a loop and invites the audience to think or respond.",
    },
    {
      type: "surprising_fact",
      description:
        "Uses a data point or unexpected statement to stop scrolling.",
    },
    {
      type: "emotion",
      description:
        "Uses vulnerability, humour, frustration, aspiration or shared feeling.",
    },
    {
      type: "bold_statement",
      description:
        "Makes a strong claim that creates curiosity or disagreement.",
    },
    {
      type: "pain_point",
      description: "Starts from a problem the audience recognises.",
    },
  ],

  // ─────────────────────────────────────────────────────────────────────
  // CTA quality signals
  // ─────────────────────────────────────────────────────────────────────
  ctaQualitySignals: {
    good: [
      "one clear action",
      "specific next step",
      "value-driven wording",
      "placed clearly, often near the end or separated by a line break",
    ],
    weak: [
      "vague CTA",
      "multiple competing actions",
      "CTA hidden in a long paragraph",
      "generic wording such as 'check it out' without context",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // Conversation triggers
  // ─────────────────────────────────────────────────────────────────────
  conversationTriggers: [
    "question",
    "bold statement",
    "humour",
    "shared pain point",
    "relatable moment",
    "opinion prompt",
  ],

  // ─────────────────────────────────────────────────────────────────────
  // Hashtag guidelines
  // ─────────────────────────────────────────────────────────────────────
  hashtagGuidelines: {
    recommendedRange: {
      min: 3,
      max: 5,
      description:
        "As an editorial reference, 3–5 relevant hashtags per post is a balanced range. Quality and relevance matter more than quantity.",
    },
    recommendedMix: [
      "brand hashtag",
      "community hashtag",
      "product or service hashtag",
      "topic or niche hashtag",
      "contextual hashtag",
    ],
    commonIssues: [
      "too many generic hashtags",
      "hashtags unrelated to the content",
      "using trending hashtags without relevance",
      "repeating the exact same hashtag set across all posts",
      "using hashtags without supporting caption context",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // Brand voice
  // ─────────────────────────────────────────────────────────────────────
  brandVoice: {
    description:
      "Captions should maintain a consistent voice that reflects the brand personality while adapting to different content formats.",
    signals: [
      "consistent tone",
      "recognisable perspective",
      "natural language",
      "appropriate emoji usage",
      "clear point of view",
    ],
    issues: [
      "robotic wording",
      "generic phrases",
      "inconsistent tone",
      "inside jokes without context",
      "excessive emojis",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // Formatting guidelines
  // ─────────────────────────────────────────────────────────────────────
  formattingGuidelines: {
    good: [
      "short paragraphs",
      "line breaks between ideas",
      "clear CTA separation",
      "scannable structure",
      "hashtags placed cleanly",
    ],
    issues: [
      "dense wall of text",
      "unclear punctuation",
      "missing context",
      "too many ideas in one caption",
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // Common caption mistakes
  // ─────────────────────────────────────────────────────────────────────
  commonCaptionMistakes: [
    "generic phrases",
    "weak hooks",
    "missing CTA",
    "too many CTAs",
    "brand voice inconsistency",
    "hashtag misuse",
    "missing context",
    "poor formatting",
    "weak first sentence",
  ],
} as const;

// ---------------------------------------------------------------------------
// Helper types
// ---------------------------------------------------------------------------

export type InstagramCaptionContext = typeof INSTAGRAM_CAPTION_CONTEXT;

export type InstagramCaptionSource =
  (typeof INSTAGRAM_CAPTION_CONTEXT)["sources"][number];