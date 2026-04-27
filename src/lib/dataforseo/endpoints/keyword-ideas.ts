/**
 * DataForSEO Labs — Keyword Ideas (live).
 * https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_ideas/live/
 *
 * Defensive caps:
 *   - up to 20 seed keywords
 *   - hard `limit` cap of 50 results (overrideable but never above 100)
 */
import { callDataForSeo } from "../client";
import type { DataForSeoEnvelope } from "../types";

export interface KeywordIdeasInput {
  keywords: string[];
  location_name?: string;       // default "Portugal"
  language_code?: string;       // default "pt"
  limit?: number;               // default 50, max 100
  include_seed_keyword?: boolean;
  include_serp_info?: boolean;
}

export interface KeywordIdeasItem {
  se_type?: string;
  keyword?: string;
  location_code?: number;
  language_code?: string;
  keyword_info?: {
    search_volume?: number | null;
    cpc?: number | null;
    competition?: number | null;
    competition_level?: string | null;
    monthly_searches?: Array<{
      year: number;
      month: number;
      search_volume: number | null;
    }> | null;
  } | null;
}

export interface KeywordIdeasResult {
  seed_keywords?: string[];
  total_count?: number;
  items_count?: number;
  items?: KeywordIdeasItem[];
}

export async function fetchKeywordIdeas(
  input: KeywordIdeasInput,
): Promise<DataForSeoEnvelope<KeywordIdeasResult>> {
  if (!input.keywords?.length) {
    throw new Error("keyword-ideas: at least 1 seed keyword required");
  }
  const seeds = input.keywords.slice(0, 20);
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 100);
  const gateValue = seeds[0];
  return callDataForSeo<KeywordIdeasResult>(
    "labs_keyword_ideas",
    {
      keywords: seeds,
      location_name: input.location_name ?? "Portugal",
      language_code: input.language_code ?? "pt",
      limit,
      include_seed_keyword: input.include_seed_keyword ?? true,
      include_serp_info: input.include_serp_info ?? false,
    },
    { gateValue },
  );
}