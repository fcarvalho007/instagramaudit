/**
 * Public analysis API contract — shared between server route and browser client.
 * Stable, frontend-friendly shape. Raw Apify payloads must never reach this.
 */

import type { BenchmarkFormat } from "@/lib/benchmark/types";

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
  profile: PublicAnalysisProfile;
  content_summary: PublicAnalysisContentSummary;
  competitors: CompetitorAnalysis[];
  status: PublicAnalysisStatus;
}

export type PublicAnalysisErrorCode =
  | "INVALID_USERNAME"
  | "PROFILE_NOT_FOUND"
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
