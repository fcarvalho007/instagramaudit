/**
 * Pure selector: read cached AI comparison readings off a snapshot payload.
 * Returns null when the cache is missing, pending, failed, or malformed.
 * Never throws — safeParse + try/catch guarantee a degraded-but-stable UI.
 */

import { useMemo } from "react";
import {
  COMPARISON_READINGS_KEY,
  COMPARISON_READINGS_V2_KEY,
  StoredComparisonCollectionSchema,
  StoredComparisonReadingsSchema,
  type CardReading,
  type ComparisonReadingCardId,
} from "@/lib/comparison-readings/types";

export interface ComparisonReadingsLookup {
  global: {
    headline: string;
    key_reading: string;
    confidence: "low" | "medium" | "high";
  };
  byCard: Partial<Record<ComparisonReadingCardId, CardReading>>;
  generatedAt: string;
  evidencePack?: Record<string, unknown>;
}

export function selectComparisonReadings(
  payload: unknown,
  competitorHandle?: string,
  window?: string | null,
): ComparisonReadingsLookup | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  const collection = StoredComparisonCollectionSchema.safeParse(data[COMPARISON_READINGS_V2_KEY]);
  const handle = competitorHandle?.replace(/^@/, "").toLowerCase();
  const raw = collection.success
    ? handle
      ? collection.data.by_competitor[handle]
      : undefined
    : data[COMPARISON_READINGS_KEY];
  if (!raw) return null;

  const parsed = StoredComparisonReadingsSchema.safeParse(raw);
  if (!parsed.success) return null;
  if (handle && parsed.data.competitor_handle.toLowerCase() !== handle) return null;
  const expectedWindow =
    window ?? (typeof data.analysis_window === "string" ? data.analysis_window : null);
  if (expectedWindow && (parsed.data.window ?? "baseline") !== expectedWindow) return null;
  if (parsed.data.status !== "ready" || !parsed.data.readings) return null;

  const byCard: ComparisonReadingsLookup["byCard"] = {};
  for (const card of parsed.data.readings.cards) {
    byCard[card.card_id] = card;
  }
  return {
    global: parsed.data.readings.global_summary,
    byCard,
    generatedAt: parsed.data.generated_at,
    evidencePack: parsed.data.evidence_pack,
  };
}

export function useComparisonReadings(
  payload: unknown,
  competitorHandle?: string,
  window?: string | null,
): ComparisonReadingsLookup | null {
  return useMemo(() => selectComparisonReadings(payload, competitorHandle, window), [payload, competitorHandle, window],
  );
}
