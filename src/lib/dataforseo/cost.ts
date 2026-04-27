import type { DataForSeoEnvelope } from "./types";

/**
 * Extracts the actual USD cost reported by DataForSEO at the envelope level.
 * Falls back to summing per-task costs when envelope cost is missing.
 */
export function extractActualCost(envelope: DataForSeoEnvelope): number {
  if (typeof envelope.cost === "number" && envelope.cost > 0) {
    return envelope.cost;
  }
  if (Array.isArray(envelope.tasks)) {
    return envelope.tasks.reduce(
      (sum, t) => sum + (typeof t.cost === "number" ? t.cost : 0),
      0,
    );
  }
  return 0;
}