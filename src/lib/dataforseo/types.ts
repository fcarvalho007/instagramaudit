/**
 * DataForSEO shared types and typed errors (server-only).
 */

export type DataForSeoEndpoint =
  | "google_trends_explore"
  | "labs_keyword_ideas"
  | "serp_google_organic";

export interface DataForSeoEnvelope<T = unknown> {
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks?: Array<{
    id: string;
    status_code: number;
    status_message: string;
    time: string;
    cost: number;
    result_count: number;
    path: string[];
    data: Record<string, unknown>;
    result: T[] | null;
  }>;
}

export class DataForSeoConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataForSeoConfigError";
  }
}

export class DataForSeoBlockedError extends Error {
  reason: "kill_switch" | "allowlist";
  constructor(reason: "kill_switch" | "allowlist", message: string) {
    super(message);
    this.name = "DataForSeoBlockedError";
    this.reason = reason;
  }
}

export class DataForSeoUpstreamError extends Error {
  status: number;
  apiStatusCode?: number;
  apiStatusMessage?: string;
  constructor(
    message: string,
    status: number,
    apiStatusCode?: number,
    apiStatusMessage?: string,
  ) {
    super(message);
    this.name = "DataForSeoUpstreamError";
    this.status = status;
    this.apiStatusCode = apiStatusCode;
    this.apiStatusMessage = apiStatusMessage;
  }
}

/** Default static cost estimate (USD) per request — refined over time. */
export const ESTIMATED_COST_USD: Record<DataForSeoEndpoint, number> = {
  google_trends_explore: 0.0006,
  labs_keyword_ideas: 0.01,
  serp_google_organic: 0.002,
};

/** Default cache TTL (seconds) per endpoint. */
export const CACHE_TTL_SECONDS: Record<DataForSeoEndpoint, number> = {
  google_trends_explore: 60 * 60 * 24,         // 24h
  labs_keyword_ideas: 60 * 60 * 24 * 7,        // 7 days
  serp_google_organic: 60 * 60 * 12,           // 12h
};