/**
 * Shared types for the OpenAI insights layer.
 *
 * The persisted shape lives at `analysis_snapshots.normalized_payload.ai_insights_v1`.
 * Versioned via `schema_version` so future iterations can co-exist with
 * older snapshots without forced regeneration.
 *
 * Pure type module — no runtime code, safe to import from anywhere.
 */

import type { BenchmarkPositioning } from "@/lib/benchmark/types";
import type {
  PublicAnalysisContentSummary,
  PublicAnalysisProfile,
} from "@/lib/analysis/types";

/** A single recommendation/observation produced by the model. */
export interface AiInsightItem {
  /**
   * Stable, machine-readable identifier (e.g. "ENG_GAP", "REELS_LOW").
   * Used by the UI to map to icons / accent colours and to keep ordering
   * stable across re-runs of the same snapshot.
   */
  id: string;
  /** Short editorial title in pt-PT (AO90, impessoal). */
  title: string;
  /** Body copy in pt-PT (AO90, impessoal). 1–3 sentences. */
  body: string;
  /**
   * Names of the data signals this insight cites. Free-form strings keyed
   * to the input context (e.g. "benchmark.tier_label",
   * "content_summary.average_engagement_rate"). Empty = generic insight,
   * which the validator MUST reject.
   */
  evidence: string[];
  /**
   * Editorial confidence label. "baseado em dados observados" when every
   * cited signal was present in the snapshot; "sinal parcial" when at
   * least one signal was missing or partial.
   */
  confidence: "baseado em dados observados" | "sinal parcial";
  /** Higher = more important. Used for stable ordering in the UI/PDF. */
  priority: number;
}

/** The persisted insights payload. */
export interface AiInsightsV1 {
  schema_version: 1;
  /** ISO-8601 timestamp of when the OpenAI call returned. */
  generated_at: string;
  /** Model identifier returned by the OpenAI response (e.g. "gpt-4.1-mini"). */
  model: string;
  /** Hash + flags describing the inputs the model saw. Enables drift detection. */
  source_signals: {
    inputs_hash: string;
    has_market_signals: boolean;
    has_dataforseo_paid: boolean;
  };
  /** 4–6 insights, sorted by priority desc. */
  insights: AiInsightItem[];
  /** Token usage + estimated USD cost computed via `lib/insights/cost.ts`. */
  cost: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    estimated_cost_usd: number;
  };
}

/**
 * Inputs given to the prompt builder. Intentionally narrow — only what
 * the model needs to interpret. No raw Apify payload, no PII beyond what
 * is already public in the snapshot.
 */
export interface InsightsContext {
  profile: PublicAnalysisProfile;
  content_summary: PublicAnalysisContentSummary;
  /**
   * Top posts (already sorted by engagement desc upstream). Capped to a
   * small number by the prompt builder to keep token usage low.
   */
  top_posts: Array<{
    format: "Reels" | "Carrosséis" | "Imagens";
    likes: number;
    comments: number;
    engagement_pct: number;
    caption_excerpt: string;
  }>;
  benchmark: BenchmarkPositioning | null;
  competitors_summary: {
    count: number;
    median_engagement_pct: number | null;
  };
  market_signals: {
    has_free: boolean;
    has_paid: boolean;
    /** Top usable keywords from the free DataForSEO/Trends pipeline. */
    top_keywords?: string[];
    /** Single keyword with the highest mean Trends value. */
    strongest_keyword?: string | null;
    /** Trend direction for `strongest_keyword` over the observed window. */
    trend_direction?: "up" | "flat" | "down" | null;
    /** Keywords that returned no usable data in Trends. */
    dropped_keywords?: string[];
  };
}

/** Result envelope returned by the (future) generator. */
export interface InsightsGenerationResult {
  ok: boolean;
  /** Populated when ok=true and the response passed Zod validation. */
  insights: AiInsightsV1 | null;
  /** Short reason code when ok=false (e.g. "DISABLED", "NOT_ALLOWED",
   *  "OPENAI_ERROR", "SCHEMA_INVALID", "TIMEOUT"). */
  reason: string | null;
  /** Optional human-readable detail. Sanitised, never raw provider output. */
  detail?: string | null;
}
