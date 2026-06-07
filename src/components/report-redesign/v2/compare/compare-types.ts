/**
 * Shared types for the "Profile vs Competitor" comparison primitives.
 *
 * Phase 0 — these primitives are reusable building blocks that any Pro
 * report card can plug in once `ReportData.competitorBreakdown` carries
 * the relevant per-competitor metric. They do not fetch, normalize or
 * mutate snapshot data — the caller passes deterministic values.
 */

export type CompareUnit = "pp" | "percent" | "x" | "abs";

export interface CompareSide {
  /** Username without leading "@" — primitive renders the "@". */
  handle: string;
  /** Raw numeric value used for delta calculation. */
  value: number;
  /** Pre-formatted, user-facing string (pt-PT, with units). */
  formatted: string;
  /**
   * Optional per-side deterministic text shown under the value
   * (e.g. "↓ abaixo do concorrente", "4,8× o teu valor").
   *
   * When both sides omit it, `CompareStatBlock` falls back to its
   * legacy centered delta chip for back-compat.
   */
  subText?: string;
  /**
   * Optional exact-value text used as the `title` attribute on the value
   * (native tooltip on hover). When omitted, the `formatted` string is
   * used. Useful when `formatted` is a compact notation like "1,1 M" and
   * the caller wants to expose the precise underlying integer.
   */
  title?: string;
}

export interface CompareBarCategory {
  key: string;
  label: string;
  /** Raw numeric value for the primary profile in this category. */
  primary: number;
  /** Raw numeric value for the competitor in this category. */
  competitor: number;
  /** Optional pre-formatted values (defaults to "<value><unit>"). */
  primaryFormatted?: string;
  competitorFormatted?: string;
}

export interface CompareTableRow {
  label: string;
  primary: string;
  competitor: string;
}