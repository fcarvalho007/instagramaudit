import type { CompareUnit } from "./compare-types";

/**
 * Deterministic pt-PT delta label between two raw values.
 *
 * Rules:
 * - "pp" → absolute difference in percent points, signed (`+0,42 pp`).
 * - "percent" / "x" / "abs" → relative difference in %, signed (`+12 %`).
 * - Falls back to "igual" when |delta| rounds to zero at the displayed
 *   precision so the UI never prints noise like `+0,00 pp`.
 *
 * `higherIsBetter` is used by the caller to pick the colour token — the
 * label itself is neutral and always describes the primary profile vs the
 * competitor.
 */
export type DeltaTone = "positive" | "negative" | "neutral";

export interface DeltaResult {
  label: string;
  tone: DeltaTone;
}

function fmtNumberPt(value: number, digits: number): string {
  return value.toLocaleString("pt-PT", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function buildDelta(
  primary: number,
  competitor: number,
  unit: CompareUnit,
  higherIsBetter: boolean,
): DeltaResult {
  if (!Number.isFinite(primary) || !Number.isFinite(competitor)) {
    return { label: "—", tone: "neutral" };
  }

  if (unit === "pp") {
    const diff = primary - competitor;
    const rounded = Math.round(diff * 100) / 100;
    if (rounded === 0) return { label: "igual", tone: "neutral" };
    const sign = rounded > 0 ? "+" : "−";
    return {
      label: `${sign}${fmtNumberPt(Math.abs(rounded), 2)} pp`,
      tone: tone(rounded, higherIsBetter),
    };
  }

  // Relative variant — competitor as base.
  if (competitor === 0) {
    if (primary === 0) return { label: "igual", tone: "neutral" };
    return {
      label: primary > 0 ? "novo" : "—",
      tone: tone(primary, higherIsBetter),
    };
  }

  const pct = ((primary - competitor) / Math.abs(competitor)) * 100;
  const rounded = Math.round(pct);
  if (rounded === 0) return { label: "igual", tone: "neutral" };
  const sign = rounded > 0 ? "+" : "−";
  return {
    label: `${sign}${Math.abs(rounded)} %`,
    tone: tone(rounded, higherIsBetter),
  };
}

function tone(diff: number, higherIsBetter: boolean): DeltaTone {
  if (diff === 0) return "neutral";
  const wins = higherIsBetter ? diff > 0 : diff < 0;
  return wins ? "positive" : "negative";
}