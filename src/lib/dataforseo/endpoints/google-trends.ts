/**
 * Google Trends Explore (live) — measures interest over time/region.
 * https://docs.dataforseo.com/v3/keywords_data/google_trends/explore/live/
 */
import { callDataForSeo } from "../client";
import type { DataForSeoEnvelope } from "../types";

export interface GoogleTrendsInput {
  /** Instagram report owner — the only value matched against the allowlist. */
  ownerHandle: string;
  keywords: string[];                 // up to 5
  location_name?: string;             // e.g. "Portugal"
  language_code?: string;             // e.g. "pt"
  time_range?: "past_hour" | "past_4_hours" | "past_day" | "past_7_days" |
               "past_30_days" | "past_90_days" | "past_12_months" |
               "past_5_years" | "all_time";
  category_code?: number;
  type?: "web" | "news" | "youtube" | "images" | "froogle";
}

export interface GoogleTrendsResult {
  keywords: string[];
  location_code?: number;
  language_code?: string;
  check_url?: string;
  datetime?: string;
  items?: Array<{
    type: string;
    title?: string;
    keywords?: string[];
    data?: Array<{
      date_from?: string;
      date_to?: string;
      timestamp?: number;
      values?: Array<number | null>;
      missing_data?: boolean;
    }>;
  }>;
}

export async function fetchGoogleTrends(
  input: GoogleTrendsInput,
): Promise<DataForSeoEnvelope<GoogleTrendsResult>> {
  if (!input.keywords?.length || input.keywords.length > 5) {
    throw new Error("google-trends: 1..5 keywords required");
  }
  if (!input.ownerHandle?.trim()) {
    throw new Error("google-trends: ownerHandle required");
  }
  const queryLabel = input.keywords.join(",");
  return callDataForSeo<GoogleTrendsResult>(
    "google_trends_explore",
    {
      keywords: input.keywords,
      location_name: input.location_name ?? "Portugal",
      language_code: input.language_code ?? "pt",
      time_range: input.time_range ?? "past_12_months",
      category_code: input.category_code,
      type: input.type ?? "web",
    },
    { ownerHandle: input.ownerHandle, queryLabel },
  );
}