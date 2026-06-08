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

export const CardReadingSchema = z.object({
  card_id: CardIdSchema,
  headline: z.string().min(1).max(120),
  key_reading: z.string().min(1).max(500),
  evidence_points: z.array(EvidencePointSchema).max(4).default([]),
  recommendation: z.string().max(280).nullable(),
  confidence: ConfidenceSchema,
  caveats: z.array(z.string().max(160)).max(4).default([]),
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
});
export type StoredComparisonReadings = z.infer<typeof StoredComparisonReadingsSchema>;

export const COMPARISON_READINGS_KEY = "ai_comparison_readings_v1" as const;
export const COMPARISON_READINGS_PROMPT_VERSION = "v1" as const;
export const COMPARISON_READINGS_MODEL = "google/gemini-3-flash-preview" as const;