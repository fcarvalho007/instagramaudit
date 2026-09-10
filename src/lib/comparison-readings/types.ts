/**
 * Strict Zod schema for AI editorial readings in Profile vs Competitor cards.
 * Consumed both server-side (validate model output) and client-side
 * (safeParse cached payload — malformed data is silently ignored).
 */

import { z } from "zod";

export const COMPARISON_READING_CARD_IDS = [
  "overview",
  "engagement",
  "cadence",
  "weekday_rhythm",
  "format_mix",
  "bio_conversion",
  "top_posts",
] as const;

export const CardIdSchema = z.enum(COMPARISON_READING_CARD_IDS);
export type ComparisonReadingCardId = z.infer<typeof CardIdSchema>;

export const EvidencePointSchema = z.object({
  label: z.string().min(1).max(80),
  field: z.string().min(1).max(80),
  primary_value: z.union([z.string(), z.number(), z.null()]),
  competitor_value: z.union([z.string(), z.number(), z.null()]),
});

export const ConfidenceSchema = z.enum(["low", "medium", "high"]);

export const SourceExcerptSchema = z.object({
  side: z.enum(["primary", "competitor"]),
  post_id: z.string().min(1).max(200),
  quote: z.string().min(1).max(240),
  permalink: z.string().nullable().optional(),
  date: z.string().nullable().optional(),
});
export const ExperimentSchema = z.object({
  hypothesis: z.string().min(1).max(400),
  execution: z.string().min(1).max(500),
  effort: z.enum(["baixo", "medio", "alto"]),
  duration_days: z.number().int().min(7).max(90),
  intended_posts: z.number().int().min(1).max(24),
  success_metric: z.enum(["median_likes", "median_comments", "median_engagement_pct"]),
  evaluation: z.string().min(1).max(400),
});
export const CardReadingSchema = z.object({
  card_id: CardIdSchema,
  headline: z.string().min(1).max(120),
  key_reading: z.string().min(1).max(500),
  evidence_points: z.array(EvidencePointSchema).max(4).default([]),
  recommendation: z.string().max(280).nullable(),
  confidence: ConfidenceSchema,
  caveats: z.array(z.string().max(240)).max(6).default([]),
  sources: z.array(SourceExcerptSchema).max(4).default([]),
  diagnosis: z
    .object({
      pattern: z.string().max(400),
      interpretation: z.string().max(400),
      transferability: z.string().max(400),
    })
    .optional(),
  experiment: ExperimentSchema.nullable().optional(),
  priority_rank: z.number().int().min(1).max(3).nullable().optional(),
});

export const ComparisonAIReadingsSchema = z.object({
  version: z.literal("1"),
  language: z.literal("pt-PT"),
  global_summary: z.object({
    headline: z.string().min(1).max(140),
    key_reading: z.string().min(1).max(420),
    confidence: ConfidenceSchema,
  }),
  cards: z.array(CardReadingSchema).min(1).max(7),
});

export type CardReading = z.infer<typeof CardReadingSchema>;
export type ComparisonAIReadings = z.infer<typeof ComparisonAIReadingsSchema>;

/** Wrapper persisted under `normalized_payload.ai_comparison_readings_v1`. */
export const StoredComparisonReadingsSchema = z.object({
  version: z.literal("1"),
  model: z.string(),
  prompt_version: z.string(),
  evidence_hash: z.string(),
  competitor_handle: z.string(),
  window: z.string().nullable(),
  generated_at: z.string(),
  status: z.enum(["ready", "failed"]),
  readings: ComparisonAIReadingsSchema.nullable(),
  error: z.string().optional(),
  evidence_pack: z.record(z.unknown()).optional(),
});
export type StoredComparisonReadings = z.infer<typeof StoredComparisonReadingsSchema>;

export const COMPARISON_READINGS_KEY = "ai_comparison_readings_v1" as const;
export const COMPARISON_READINGS_V2_KEY = "ai_comparison_readings_v2" as const;
export const StoredComparisonCollectionSchema = z.object({
  version: z.literal(2),
  by_competitor: z.record(StoredComparisonReadingsSchema),
});
export const COMPARISON_READINGS_PROMPT_VERSION = "v2-evidence-2026-09" as const;
export const COMPARISON_READINGS_MODEL = "google/gemini-3-flash-preview" as const;
