/**
 * Pure selector: read cached AI comparison readings off a snapshot payload.
 * Returns null when the cache is missing, pending, failed, or malformed.
 * Never throws — safeParse + try/catch guarantee a degraded-but-stable UI.
 */

import { useMemo } from "react";
import {
  COMPARISON_READINGS_KEY,
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
}

export function selectComparisonReadings(
  payload: unknown,
): ComparisonReadingsLookup | null {
  if (!payload || typeof payload !== "object") return null;
  const raw = (payload as Record<string, unknown>)[COMPARISON_READINGS_KEY];
  if (!raw) return null;

  const parsed = StoredComparisonReadingsSchema.safeParse(raw);
  if (!parsed.success) return null;
  if (parsed.data.status !== "ready" || !parsed.data.readings) return null;

  const byCard: ComparisonReadingsLookup["byCard"] = {};
  for (const card of parsed.data.readings.cards) {
    byCard[card.card_id] = card;
  }
  return {
    global: parsed.data.readings.global_summary,
    byCard,
    generatedAt: parsed.data.generated_at,
  };
}

export function useComparisonReadings(
  payload: unknown,
): ComparisonReadingsLookup | null {
  return useMemo(() => selectComparisonReadings(payload), [payload]);
}