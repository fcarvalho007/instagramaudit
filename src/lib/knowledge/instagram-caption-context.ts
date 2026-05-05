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
      name: "Castmagic",
      url: "https://www.castmagic.io/post/how-to-write-instagram-captions",
      role: "hook types, caption structure, brand voice consistency, common caption mistakes",
    },
    {
      name: "Later",
      url: "https://later.com/blog/social-media-captions/",
      role: "caption goals, hooks, CTAs, keywords, hashtags and conversation triggers",
    },
    {
      name: "Shopify",
      url: "https://www.shopify.com/blog/instagram-captions",
      role: "caption length, first sentence, CTAs, hashtags and ecommerce-oriented caption guidance",
    },
  ],

  // ─────────────────────────────────────────────────────────────────────
  // Caption length buckets
  // ─────────────────────────────────────────────────────────────────────
  captionLength: {
    short: {
      maxCharacters: 50,
      label: "Curta",
      description:
        "Useful for punchy one-liners, fast reactions, product drops or simple CTAs.",
    },
    medium: {
      minCharacters: 50,
      maxCharacters: 150,
      label: "Média",
      description:
        "Useful for context, emotion or concise explanation.",
    },
    long: {
      minCharacters: 150,
      label: "Longa",
      description:
        "Useful for storytelling, education, tutorials, founder notes or detailed explanations.",
    },
  },

  // ─────────────────────────────────────────────────────────────────────
  // First-line rule
  // ─────────────────────────────────────────────────────────────────────
  firstLineRule: {
    visibleCharacters: 125,
    description:
      "The first ~125 characters are especially important because captions are commonly truncated after the opening text. The first sentence should clarify value, emotion, curiosity or the reason to keep reading.",
  },

  // ─────────────────────────────────────────────────────────────────────
  // Hook types
  // ─────────────────────────────────────────────────────────────────────
  hookTypes: [
    {
      type: "question",
      label: "Pergunta direta",
      description:
        "Invites the audience to think or respond.",
    },
    {
      type: "surprising_fact",
      label: "Facto surpreendente",
      description:
        "Uses a data point or unexpected idea to stop scrolling.",
    },
    {
      type: "emotion",
      label: "Emoção",
      description:
        "Uses vulnerability, humour, aspiration, frustration or shared feeling.",
    },
    {
      type: "bold_statement",
      label: "Afirmação direta",
      description:
        "Makes a clear statement that creates curiosity, agreement or disagreement.",
    },
    {
      type: "news_or_update",
      label: "Anúncio de novidade",
      description:
        "Signals a new launch, feature, event or timely update.",
    },
    {
      type: "story",
      label: "História / experiência",
      description:
        "Uses narrative context or a real situation to create connection.",
    },
  ],

  // ─────────────────────────────────────────────────────────────────────
  // Ending types
  // ─────────────────────────────────────────────────────────────────────
  endingTypes: [
    {
      type: "explicit_cta",
      label: "Com CTA explícito",
      description: "Ends with a clear action request.",
    },
    {
      type: "statement",
      label: "Com afirmação",
      description:
        "Ends with a closed statement rather than inviting response.",
    },
    {
      type: "hashtags_only",
      label: "Só hashtags",
      description:
        "Ends mainly with hashtags, without conversational close.",
    },
    {
      type: "question",
      label: "Com pergunta",
      description:
        "Ends with an open question that can trigger comments.",
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
      "clear line break before CTA when needed",
      "clarity over cleverness",
    ],
    weak: [
      "vague CTA",
      "multiple competing actions",
      "CTA hidden in a long paragraph",
      "generic wording without clear value",
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
  // Value / promotion balance
  // ─────────────────────────────────────────────────────────────────────
  valuePromotionBalance: {
    rule: "80/20",
    description:
      "As an editorial reference, content should prioritise value, usefulness or relationship-building before promotional requests.",
  },

  // ─────────────────────────────────────────────────────────────────────
  // Hashtag guidelines (used by P03 card)
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
  // Common caption issues
  // ─────────────────────────────────────────────────────────────────────
  commonCaptionIssues: [
    "generic phrases",
    "weak opening hook",
    "missing CTA",
    "too many CTAs",
    "brand voice inconsistency",
    "hashtag misuse",
    "missing context",
    "dense formatting",
    "weak first sentence",
    "no open-ended ending",
  ],
} as const;

// ---------------------------------------------------------------------------
// Helper types
// ---------------------------------------------------------------------------

export type InstagramCaptionContext = typeof INSTAGRAM_CAPTION_CONTEXT;

export type InstagramCaptionSource =
  (typeof INSTAGRAM_CAPTION_CONTEXT)["sources"][number];