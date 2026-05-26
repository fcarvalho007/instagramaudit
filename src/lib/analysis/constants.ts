/**
 * Shared constants for the public Instagram analysis pipeline.
 *
 * Single source of truth for limits and the Apify data contract. Keeping
 * these centralised prevents drift between the actor input (what we ask
 * Apify for) and the normalization layer (what we trust on the way out).
 */

/**
 * Maximum number of recent posts requested from the Apify Instagram actor
 * per profile and, defensively, kept by `enrichPosts` when normalising
 * raw payloads.
 *
 * Used in:
 * - `src/routes/api/analyze-public-v1.ts` → actor input `resultsLimit`
 * - `src/lib/analysis/normalize.ts`       → slice in `enrichPosts`
 *
 * NOTE: This is NOT the number of profiles per run. One run analyses one
 * profile (`maxItems: 1`) and returns up to this many posts inside
 * `latestPosts[]`. See the actor input block in `analyze-public-v1.ts`.
 */
export const PUBLIC_INSTAGRAM_POSTS_LIMIT = 12;

/**
 * Living documentation of what comes from Apify vs what we compute
 * internally. Surfaced as a runtime object so it can be referenced by
 * tests and by future QA/debug tooling without re-stating the contract.
 *
 * If you add a new derived metric, list it under `derived_internally`.
 * If Apify starts returning a new field we consume, list it under
 * `fields_from_apify`. Do not list private metrics here — Instagram does
 * not expose them publicly (see `not_available_publicly`).
 */
export const APIFY_PUBLIC_DATA_CONTRACT = {
  actor: "apify/instagram-scraper",
  fields_from_apify: [
    // Profile-level
    "username",
    "display_name",
    "bio",
    "avatar_url",
    "followers_count",
    "following_count",
    "posts_count",
    "is_verified",
    "is_business",
    "category",
    "external_urls",
    // Post-level (inside latestPosts[])
    "post_id",
    "shortcode",
    "permalink",
    "caption",
    "likes",
    "comments",
    "timestamp",
    "format",
    "thumbnail_url",
    "video_views",
    "video_duration",
    "is_pinned",
    "coauthors",
    "tagged_users",
    "location_name",
    "music_title",
  ],
  derived_internally: [
    "engagement_rate",
    "average_likes",
    "average_comments",
    "weekly_cadence",
    "format_distribution",
    "hashtags",
    "mentions",
    "editorial_diagnosis",
    "benchmark_positioning",
    "market_search_signals",
    "ai_editorial_verdict",
  ],
  not_available_publicly: [
    "reach",
    "impressions",
    "saves",
    "profile_visits",
    "stories",
  ],
} as const;

export type ApifyPublicDataContract = typeof APIFY_PUBLIC_DATA_CONTRACT;