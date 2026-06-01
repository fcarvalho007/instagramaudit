import type { EnrichedPost, FormatStats } from "./normalize";
/**
 * Public analysis API contract — shared between server route and browser client.
 * Stable, frontend-friendly shape. Raw Apify payloads must never reach this.
 */

import type {
  BenchmarkFormat,
  BenchmarkPositioning,
} from "@/lib/benchmark/types";

export interface PublicAnalysisProfile {
  username: string;
  display_name: string;
  avatar_url: string | null;
  /** Persisted Supabase Storage URL for the avatar; `null` until persistence runs. */
  avatar_storage_url?: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number | null;
  posts_count: number | null;
  is_verified: boolean;
  /** IG business category (when available). Optional for back-compat. */
  category?: string | null;
  /** External links from the bio. Optional. */
  external_urls?: string[];
  /** Highlight reel count. Optional. */
  highlight_reel_count?: number | null;
  /** Whether the profile has an IG video channel. Optional. */
  has_channel?: boolean;
  /** Business / professional account flag. Optional. */
  is_business?: boolean;
}

export interface PublicAnalysisContentSummary {
  posts_analyzed: number;
  dominant_format: BenchmarkFormat;
  average_likes: number;
  average_comments: number;
  average_engagement_rate: number; // percent
  estimated_posts_per_week: number;
}

export interface PublicAnalysisStatus {
  success: true;
  /**
   * Freshness of the response:
   * - "fresh": just scraped from the provider
   * - "cache": served from a non-expired snapshot (< 24h old)
   * - "stale": provider failed, served from an expired but recent snapshot (< 7d old)
   */
  data_source: "fresh" | "cache" | "stale";
  analyzed_at: string; // ISO timestamp
}

/**
 * Bloco de frescura — exposto ao frontend para decidir UI:
 * "Actualizado hoje", CTA de refresh manual (12–24h), aviso de fallback.
 * Calculado server-side em cima do snapshot servido na resposta.
 */
export interface PublicAnalysisFreshness {
  /**
   *  - `fresh_under_12h` → snapshot < 12h, sem CTA de refresh.
   *  - `fresh_12_to_24h` → snapshot 12–24h, mostra CTA "Actualizar análise".
   *  - `fresh_just_now` → acabou de ser scraped, equivalente a `fresh_under_12h`.
   *  - `fallback_stale` → fresh falhou, estamos a servir snapshot antigo.
   */
  state:
    | "fresh_just_now"
    | "fresh_under_12h"
    | "fresh_12_to_24h"
    | "fallback_stale";
  /** ISO `created_at` do snapshot servido. */
  snapshot_created_at: string;
  /** Idade do snapshot em horas (1 casa decimal). */
  snapshot_age_hours: number;
  /** True quando o CTA público de refresh deve estar visível. */
  refresh_available: boolean;
  /**
   * True quando o refresh manual debitaria 1 crédito. Hoje sempre `false`
   * (não há tabela de créditos); reservado para activação futura.
   */
  refresh_requires_credit: boolean;
  /**
   * True quando esta resposta é um fallback: tentámos correr fresh
   * (porque o snapshot já tinha > 24h ou o utilizador pediu refresh) e
   * o provider falhou — servimos o snapshot anterior com aviso na UI.
   */
  is_fallback: boolean;
}

export type CompetitorErrorCode =
  | "PROFILE_NOT_FOUND"
  | "POSTS_UNAVAILABLE"
  | "UPSTREAM_FAILED";

export type CompetitorAnalysis =
  | {
      success: true;
      profile: PublicAnalysisProfile;
      content_summary: PublicAnalysisContentSummary;
    }
  | {
      success: false;
      username: string;
      error_code: CompetitorErrorCode;
      message: string; // pt-PT, user-facing
    };

export interface PublicAnalysisSuccess {
  success: true;
  /**
   * UUID of the persisted `analysis_snapshots` row that backs this response.
   * The frontend echoes this id back when the user requests a full report so
   * the request can be linked to the exact data shown on screen — making
   * future PDF generation deterministic and reproducible regardless of cache
   * rotation. Optional for backward compatibility with snapshots persisted
   * before this field was introduced.
   */
  analysis_snapshot_id?: string;
  profile: PublicAnalysisProfile;
  content_summary: PublicAnalysisContentSummary;
  competitors: CompetitorAnalysis[];
  status: PublicAnalysisStatus;
  /**
   * Política de frescura aplicada a esta resposta. Opcional para
   * backward compatibility com snapshots persistidos antes deste campo.
   */
  freshness?: PublicAnalysisFreshness;
  /**
   * Benchmark positioning resolved server-side using the cloud-managed
   * `benchmark_references` dataset. Optional for backward compatibility with
   * snapshots stored before this field existed — the dashboard falls back to
   * client-side computation when absent.
   */
  benchmark_positioning?: BenchmarkPositioning;
  /**
   * Step 1 of the Real Report Data Layer — post-level detail captured at
   * scrape time. Optional for backward compatibility with snapshots stored
   * before enrichment was added. Capped at 12 posts.
   */
  posts?: EnrichedPost[];
  /**
   * Per-format aggregates (count, share %, avg engagement %) computed from
   * the same enriched posts. Optional for backward compatibility.
   */
  format_stats?: FormatStats;
  /**
   * Comment-level intelligence derived from apify/instagram-comment-scraper.
   * Absent when COMMENT_SCRAPER_ENABLED=false or scraper failed.
   */
  comment_intelligence?: CommentIntelligence;
}

export type PublicAnalysisErrorCode =
  | "INVALID_USERNAME"
  | "PROFILE_NOT_FOUND"
  | "PROFILE_NOT_ALLOWED"
  | "PROFILE_PRIVATE"
  | "PROFILE_PERSONAL_NO_FEED"
  | "PROVIDER_DISABLED"
  | "BUDGET_EXCEEDED"
  | "RATE_LIMITED"
  | "UPSTREAM_FAILED"
  | "UPSTREAM_UNAVAILABLE"
  | "NETWORK_ERROR"
  | "CACHE_ONLY_NO_DATA"
  | "ONBOARDING_REQUIRED"
  | "INSUFFICIENT_CREDITS";

export interface PublicAnalysisFailure {
  success: false;
  error_code: PublicAnalysisErrorCode;
  message: string; // pt-PT, user-facing
}

export type PublicAnalysisResponse =
  | PublicAnalysisSuccess
  | PublicAnalysisFailure;

// ─────────────────────────────────────────────────────────────────────
// Comment Intelligence
// ─────────────────────────────────────────────────────────────────────

export interface CommentIntelligence {
  available: boolean;
  source: "apify_comments";
  /** Reason the feature is unavailable (only when available=false). */
  reason?:
    | "comment_scraper_failed"
    | "comment_scraper_disabled"
    | "no_posts_with_comments"
    | "no_valid_post_urls"
    | "budget_blocked"
    | "processing"
    | "comment_scraper_timeout";
  /** Number of posts whose comments were sampled. */
  samplePosts: number;
  /** Total top-level + reply-level comments analysed across all sampled posts. */
  sampleComments: number;
  /** Total reply-level comments analysed. */
  sampleReplies: number;
  /** The profile username used for owner detection. */
  ownerUsername: string;
  /** Number of comments + replies authored by the profile owner. */
  ownerRepliesCount: number;
  /** ownerRepliesCount / audienceCommentsCount × 100. */
  ownerReplyRatePct: number;
  /** % of sampled posts where the owner replied at least once. */
  postsWithOwnerReplyPct: number;
  /** Total comments from non-owner users. */
  audienceCommentsCount: number;
  /** Number of unique audience commenters (distinct usernames). */
  uniqueAudienceCommentersCount: number;
  /** % of sampled posts where at least one conversation thread exists. */
  postsWithConversationPct: number;
  /** Audience comments classified as questions. */
  questionsFromAudienceCount: number;
  /** Audience comments expressing praise / positive sentiment. */
  praiseCount: number;
  /** Audience comments expressing complaint or issue. */
  complaintOrIssueCount: number;
  /** Audience comments expressing buying intent. */
  buyingIntentCount: number;
  /** Audience comments classified as spam or low quality. */
  spamOrLowQualityCount: number;
  /** Top conversation signals detected across all comments. */
  dominantConversationSignals: string[];
  /** Actionable recommendation for the brand. */
  recommendedConversationAction: string;
  /** Post with most owner interaction. */
  topConversationPost?: {
    postUrl: string;
    commentsCount: number;
    ownerRepliesCount: number;
  };
  /** Transparency disclaimers shown in the UI. */
  limitations: string[];
  /** Up to 5 classified comment excerpts per signal category (public data). */
  classifiedExcerpts?: {
    questions: Array<{ username: string; text: string }>;
    praise: Array<{ username: string; text: string }>;
    complaints: Array<{ username: string; text: string }>;
    buyingIntent: Array<{ username: string; text: string }>;
  };
  /** Top 2 posts by audience comment count. */
  topCommentPosts?: Array<{
    postUrl: string;
    commentsCount: number;
  }>;
}
