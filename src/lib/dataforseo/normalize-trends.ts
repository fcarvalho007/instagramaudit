/**
 * Normaliser for Google Trends results.
 *
 * Google Trends often returns a multi-keyword series where some keywords
 * have insufficient volume in the chosen geo and come back as `null` for
 * every weekly bucket. Rendering those as flat lines is misleading, so we
 * compute which keywords have at least one non-null observation and which
 * are dropped — without mutating the raw provider envelope.
 */
import type { GoogleTrendsResult } from "./endpoints/google-trends";

export interface TrendsKeywordSplit {
  /** Keywords with ≥1 non-null value in any time-series bucket. */
  usable_keywords: string[];
  /** Keywords whose entire series is null/missing. */
  dropped_keywords: string[];
}

/**
 * Inspects a Google Trends result and classifies each requested keyword
 * as usable or dropped. Pure: never mutates the input.
 *
 * The Trends "graph" item exposes `keywords[]` and `data[].values[]` where
 * the i-th value corresponds to the i-th keyword.
 */
export function splitTrendsKeywords(
  trends: GoogleTrendsResult | null | undefined,
): TrendsKeywordSplit {
  if (!trends || !Array.isArray(trends.items) || trends.items.length === 0) {
    return { usable_keywords: [], dropped_keywords: [] };
  }

  // Pick the first graph-style item that exposes a keywords array + data.
  const graph = trends.items.find(
    (it) => Array.isArray(it.keywords) && Array.isArray(it.data),
  );
  if (!graph || !graph.keywords || !graph.data) {
    return { usable_keywords: [], dropped_keywords: [...(trends.keywords ?? [])] };
  }

  const kws = graph.keywords;
  const hasValue = new Array<boolean>(kws.length).fill(false);

  for (const row of graph.data) {
    const values = Array.isArray(row.values) ? row.values : [];
    for (let i = 0; i < kws.length; i += 1) {
      if (hasValue[i]) continue;
      const v = values[i];
      if (typeof v === "number" && Number.isFinite(v)) {
        hasValue[i] = true;
      }
    }
  }

  const usable_keywords: string[] = [];
  const dropped_keywords: string[] = [];
  kws.forEach((kw, i) => {
    if (hasValue[i]) usable_keywords.push(kw);
    else dropped_keywords.push(kw);
  });

  return { usable_keywords, dropped_keywords };
}
