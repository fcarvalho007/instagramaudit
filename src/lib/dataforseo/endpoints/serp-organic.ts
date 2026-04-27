/**
 * DataForSEO SERP — Google Organic (live, advanced).
 * https://docs.dataforseo.com/v3/serp/google/organic/live/advanced/
 *
 * Defensive caps:
 *   - depth hard-capped at 30 (top 3 pages)
 *   - single keyword per call (multi-keyword would multiply cost)
 */
import { callDataForSeo } from "../client";
import type { DataForSeoEnvelope } from "../types";

export interface SerpOrganicInput {
  /** Instagram report owner — the only value matched against the allowlist. */
  ownerHandle: string;
  keyword: string;
  location_name?: string;
  language_code?: string;
  depth?: number;          // default 10, max 30
  device?: "desktop" | "mobile";
}

export interface SerpOrganicItem {
  type?: string;
  rank_group?: number;
  rank_absolute?: number;
  domain?: string;
  title?: string;
  description?: string;
  url?: string;
  breadcrumb?: string;
}

export interface SerpOrganicResult {
  keyword?: string;
  type?: string;
  se_domain?: string;
  location_code?: number;
  language_code?: string;
  check_url?: string;
  datetime?: string;
  spell?: unknown;
  refinement_chips?: unknown;
  item_types?: string[];
  se_results_count?: number;
  items_count?: number;
  items?: SerpOrganicItem[];
}

export async function fetchSerpOrganic(
  input: SerpOrganicInput,
): Promise<DataForSeoEnvelope<SerpOrganicResult>> {
  const keyword = input.keyword?.trim();
  if (!keyword) {
    throw new Error("serp-organic: keyword required");
  }
  if (!input.ownerHandle?.trim()) {
    throw new Error("serp-organic: ownerHandle required");
  }
  const depth = Math.min(Math.max(input.depth ?? 10, 1), 30);
  return callDataForSeo<SerpOrganicResult>(
    "serp_google_organic",
    {
      keyword,
      location_name: input.location_name ?? "Portugal",
      language_code: input.language_code ?? "pt",
      depth,
      device: input.device ?? "desktop",
    },
    { ownerHandle: input.ownerHandle, queryLabel: keyword },
  );
}