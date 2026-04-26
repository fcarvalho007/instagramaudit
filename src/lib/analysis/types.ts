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
  bio: string | null;
  followers_count: number;
  following_count: number | null;
  posts_count: number | null;
  is_verified: boolean;
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
}

export type PublicAnalysisErrorCode =
  | "INVALID_USERNAME"
  | "PROFILE_NOT_FOUND"
  | "PROFILE_NOT_ALLOWED"
  | "PROVIDER_DISABLED"
  | "UPSTREAM_FAILED"
  | "UPSTREAM_UNAVAILABLE"
  | "NETWORK_ERROR";

export interface PublicAnalysisFailure {
  success: false;
  error_code: PublicAnalysisErrorCode;
  message: string; // pt-PT, user-facing
}

export type PublicAnalysisResponse =
  | PublicAnalysisSuccess
  | PublicAnalysisFailure;
