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
    /**
     * Mean Trends index (0-100) for `strongest_keyword`. Rounded integer.
     * Present only when the strongest keyword had a measurable mean.
     */
    strongest_score?: number | null;
    /**
     * Percentage delta between the first quartile mean and the last quartile
     * mean of the strongest keyword series. Integer (e.g. 22 = +22%).
     * Present only when the head/tail trend calculation ran.
     */
    trend_delta_pct?: number | null;
    /**
     * Number of keywords with mean > 0 (i.e. with measurable demand).
     * Equal to `top_keywords.length`.
     */
    usable_keyword_count?: number;
    /**
     * Keywords returned by Trends but with mean = 0 across the window.
     * Available to the model only as absence/weakness context.
     */
    zero_signal_keywords?: string[];
  };
  /**
   * Compact, high-signal summary of editorial crossovers (R4-B / R5).
   * Optional and defensive: each sub-block is only present when its own
   * `available` gate is true in the source `EditorialPatterns`. The model
   * never sees the `available`/`reason` flags — only the surviving fields.
   */
  editorial_patterns?: {
    engagement_trend?: {
      /** "up" | "flat" | "down" — already translated for the model. */
      direction: "up" | "flat" | "down";
      confidence: "alta" | "média" | "baixa";
      sample_size: number;
    };
    caption_length?: {
      /** Best-performing caption-length bucket label (already pt-PT). */
      best_bucket: string;
      best_avg_engagement_pct: number;
      sample_size: number;
    };
    hashtag_count?: {
      /** "0–4" | "5–10" | "11–20" | "21+". */
      best_bucket: string;
      best_avg_engagement_pct: number;
      sample_size: number;
    };
    collaboration_lift?: {
      /** Engagement delta with vs without mentions/coauthors, in % of
       *  relative lift. e.g. delta_pct = 42 → with-mentions ER is 42%
       *  higher than without. Negative = penalty. */
      delta_pct: number;
      with_count: number;
      without_count: number;
    };
    comments_to_likes_ratio?: {
      /** comments / likes * 100, rounded to 2 decimals. Higher = more
       *  conversational audience. */
      ratio_pct: number;
      sample_size: number;
    };
    market_demand_content_fit?: {
      /** matched_keywords / total_keywords expressed as 0..100. */
      coverage_pct: number;
      matched_keywords: number;
      missing_keywords: string[];
      total_keywords: number;
    };
    format_vs_competitors?: {
      dominant_format: "Reels" | "Carrosséis" | "Imagens";
      profile_avg_engagement_pct: number;
      competitors_median_engagement_pct: number;
      delta_pct: number;
    };
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

/* ===========================================================================
 * v2 — Insights inline por secção (R3)
 * ---------------------------------------------------------------------------
 * O report redesenhado tem 9 zonas que beneficiam de uma leitura curta
 * (1-2 frases) ao lado dos números. Esta v2 alimenta esses InsightBoxes
 * com texto editorial gerado pelo modelo, fundamentado em sinais reais do
 * snapshot e em entradas verificadas da Knowledge Base.
 *
 * v1 e v2 coexistem: v1 continua a alimentar o bloco "Leitura estratégica"
 * (3-5 cartões longos); v2 alimenta as caixas inline curtas.
 * ========================================================================= */

/** As 9 secções do relatório que recebem insight inline. */
export type AiInsightV2Section =
  | "hero"
  | "marketSignals"
  | "evolutionChart"
  | "benchmark"
  | "formats"
  | "topPosts"
  | "heatmap"
  | "daysOfWeek"
  | "language";

/** Lista canónica das 9 secções, na ordem usada pelo prompt. */
export const AI_INSIGHT_V2_SECTIONS: readonly AiInsightV2Section[] = [
  "hero",
  "marketSignals",
  "evolutionChart",
  "benchmark",
  "formats",
  "topPosts",
  "heatmap",
  "daysOfWeek",
  "language",
] as const;

/** Tons editoriais aceites pelo InsightBox no report light. */
export type AiInsightV2Emphasis = "positive" | "negative" | "default" | "neutral";

/** Item curto inline para uma secção. */
export interface AiInsightV2Item {
  emphasis: AiInsightV2Emphasis;
  /** Texto editorial pt-PT (AO90), 1-2 frases, ≤ 240 caracteres. */
  text: string;
}

/** Payload persistido em `analysis_snapshots.normalized_payload.ai_insights_v2`. */
export interface AiInsightsV2 {
  schema_version: 2;
  generated_at: string;
  model: string;
  source_signals: {
    /** Hash dos inputs do prompt v2 (system + payload). */
    inputs_hash: string;
    /** Hash curto da KB (deriva de `metadata.last_updated`). */
    kb_version: string;
    has_market_signals: boolean;
  };
  cost: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    estimated_cost_usd: number;
  };
  /** Mapa secção → insight curto. Todas as 9 chaves obrigatórias. */
  sections: Record<AiInsightV2Section, AiInsightV2Item>;
}

/** Resultado tipado do gerador v2. Mesmo padrão do `InsightsGenerationResult`. */
export interface InsightsV2GenerationResult {
  ok: boolean;
  insights: AiInsightsV2 | null;
  reason: string | null;
  detail?: string | null;
}
