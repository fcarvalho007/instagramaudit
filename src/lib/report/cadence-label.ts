/**
 * Pure helpers that translate the corrected `cadence` object into
 * editorial-grade artefacts for the first-card verdict:
 *
 *   - `buildCadenceLabelPt`: a single pt-PT sentence describing posting
 *     frequency in plain language, ready to be embedded inside a paragraph.
 *   - `classifyHashtagsState`: maps `extractTopHashtags(...)` output into a
 *     "recurring | weak | absent" diagnosis so the prompt + fallback can
 *     handle the three cases consistently.
 *
 * No I/O, no i18n lookups — these are deterministic primitives the prompt
 * builder, the validator and the deterministic fallback all share. The
 * pt-PT strings are intentionally inlined: the verdict is locked to
 * European Portuguese and we want the model to receive the exact phrase
 * to embed instead of inventing a new one.
 */

export type HashtagsState = "recurring" | "weak" | "absent";

export interface CadenceLabelInput {
  weekly: number | null;
  sufficient: boolean;
}

/**
 * Convert the corrected cadence (already excludes pinned posts, prefers
 * the 30d window with cascade fallbacks — see `lib/report/cadence.ts`)
 * into a single short pt-PT sentence safe to drop inside the editorial
 * paragraph.
 *
 * Examples:
 *   weekly = 7,  sufficient = true  → "cerca de 1 post por dia"
 *   weekly = 2,  sufficient = true  → "cerca de 1 post a cada 2–3 dias"
 *   weekly = 1.2, sufficient = true → "cerca de 1 a 2 posts por semana"
 *   weekly = 0.4, sufficient = true → "menos de 1 post por semana"
 *   sufficient = false              → "a amostra ainda não permite
 *                                       avaliar a cadência com segurança"
 */
export function buildCadenceLabelPt(input: CadenceLabelInput): string {
  if (!input.sufficient || input.weekly === null || !Number.isFinite(input.weekly)) {
    return "a amostra ainda não permite avaliar a cadência com segurança";
  }
  const w = input.weekly;
  if (w >= 5) return "cerca de 1 post por dia";
  if (w >= 2) return "cerca de 1 post a cada 2–3 dias";
  if (w >= 1) return "cerca de 1 a 2 posts por semana";
  return "menos de 1 post por semana";
}

export interface HashtagUsageRow {
  tag: string;
  uses: number;
}

/**
 * Diagnose the recurring-hashtag situation from the per-tag usage rows
 * returned by `extractTopHashtags`.
 *
 * - `absent`    → no tags at all in the sample.
 * - `recurring` → at least one tag appears in 2+ posts (a real signature).
 * - `weak`      → tags exist but every single one is used exactly once
 *                 (noise, no editorial territory).
 */
export function classifyHashtagsState(
  rows: ReadonlyArray<HashtagUsageRow>,
): HashtagsState {
  if (!rows || rows.length === 0) return "absent";
  const anyRecurring = rows.some((r) => (r.uses ?? 0) >= 2);
  return anyRecurring ? "recurring" : "weak";
}

/**
 * Pick the top hashtags by usage to display in the editorial paragraph.
 * Returns a maximum of `limit` lowercased tags WITHOUT the leading `#`.
 * Skips rows with usage < 2 when the global state is "recurring" so the
 * paragraph only quotes tags that actually repeat.
 */
export function pickHashtagsForVerdict(
  rows: ReadonlyArray<HashtagUsageRow>,
  limit = 2,
): string[] {
  if (!rows || rows.length === 0) return [];
  const recurring = rows.filter((r) => (r.uses ?? 0) >= 2);
  const source = recurring.length > 0 ? recurring : rows;
  return source.slice(0, Math.max(0, limit)).map((r) => r.tag);
}