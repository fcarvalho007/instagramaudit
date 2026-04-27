/**
 * DataForSEO HTTP client (server-only).
 *
 * - Reads credentials from process.env.DATAFORSEO_LOGIN/PASSWORD.
 * - Encodes Basic Auth in runtime — never bundled to client.
 * - Enforces kill-switch (DATAFORSEO_ENABLED) and allowlist gate.
 * - Logs every attempt (success / blocked / error) into provider_call_logs.
 */
import { Buffer } from "node:buffer";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  isDataForSeoEnabled,
  isAllowed,
} from "@/lib/security/dataforseo-allowlist";
import {
  DataForSeoBlockedError,
  DataForSeoConfigError,
  DataForSeoUpstreamError,
  ESTIMATED_COST_USD,
  type DataForSeoEndpoint,
  type DataForSeoEnvelope,
} from "./types";
import { extractActualCost } from "./cost";

const DEFAULT_BASE = "https://api.dataforseo.com";
const DEFAULT_TIMEOUT_MS = 30_000;

const ENDPOINT_PATHS: Record<DataForSeoEndpoint, string> = {
  google_trends_explore: "/v3/keywords_data/google_trends/explore/live",
  labs_keyword_ideas: "/v3/dataforseo_labs/google/keyword_ideas/live",
  serp_google_organic: "/v3/serp/google/organic/live/advanced",
};

interface CallOptions {
  /**
   * Instagram report owner / handle that authorised this enrichment.
   * This — and ONLY this — is matched against `DATAFORSEO_ALLOWLIST`.
   * The derived search keyword is NEVER used as a gate.
   */
  ownerHandle: string;
  /**
   * Human-readable label for the query/keyword being sent to DataForSEO.
   * Stored in `provider_call_logs.actor` for audit; never used as gate.
   */
  queryLabel: string;
  /** Skip the allowlist check (NOT the kill-switch). Default false. */
  skipAllowlist?: boolean;
  /** Override fetch timeout. */
  timeoutMs?: number;
}

/**
 * Calls a DataForSEO live endpoint and logs the attempt.
 * Throws DataForSeoBlockedError / DataForSeoUpstreamError on failure.
 */
export async function callDataForSeo<T = unknown>(
  endpoint: DataForSeoEndpoint,
  input: Record<string, unknown> | Array<Record<string, unknown>>,
  options: CallOptions,
): Promise<DataForSeoEnvelope<T>> {
  const startedAt = Date.now();
  const ownerHandle = options.ownerHandle.trim().toLowerCase().replace(/^@/, "");
  const queryLabel = options.queryLabel.trim().slice(0, 120);
  const actorLabel = `${endpoint}:${queryLabel}`.slice(0, 200);

  // 1. Kill-switch
  if (!isDataForSeoEnabled()) {
    await logCall({
      endpoint,
      handle: ownerHandle,
      actor: actorLabel,
      status: "blocked",
      httpStatus: null,
      durationMs: Date.now() - startedAt,
      estimatedCostUsd: 0,
      actualCostUsd: 0,
      errorExcerpt: "kill_switch_off",
    });
    throw new DataForSeoBlockedError(
      "kill_switch",
      "DataForSEO calls are disabled (DATAFORSEO_ENABLED is not 'true').",
    );
  }

  // 2. Allowlist — enforced on the REPORT OWNER, never on the keyword.
  if (!options.skipAllowlist && !isAllowed(ownerHandle)) {
    await logCall({
      endpoint,
      handle: ownerHandle,
      actor: actorLabel,
      status: "blocked",
      httpStatus: null,
      durationMs: Date.now() - startedAt,
      estimatedCostUsd: 0,
      actualCostUsd: 0,
      errorExcerpt: "allowlist_miss",
    });
    throw new DataForSeoBlockedError(
      "allowlist",
      `Owner handle "${ownerHandle}" is not in DATAFORSEO_ALLOWLIST.`,
    );
  }

  // 3. Credentials
  const login = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;
  if (!login || !password) {
    throw new DataForSeoConfigError(
      "DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD are not configured.",
    );
  }
  const auth = Buffer.from(`${login}:${password}`).toString("base64");

  // 4. Build request
  const base = process.env.DATAFORSEO_BASE_URL ?? DEFAULT_BASE;
  const url = `${base}${ENDPOINT_PATHS[endpoint]}`;
  // DataForSEO expects an ARRAY of task objects.
  const body = Array.isArray(input) ? input : [input];

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const durationMs = Date.now() - startedAt;
    const text = await res.text();
    let envelope: DataForSeoEnvelope<T> | undefined;
    try {
      envelope = JSON.parse(text) as DataForSeoEnvelope<T>;
    } catch {
      envelope = undefined;
    }

    if (!res.ok || !envelope) {
      await logCall({
        endpoint,
        handle: ownerHandle,
        actor: actorLabel,
        status: "error",
        httpStatus: res.status,
        durationMs,
        estimatedCostUsd: ESTIMATED_COST_USD[endpoint],
        actualCostUsd: 0,
        errorExcerpt: text.slice(0, 500),
      });
      throw new DataForSeoUpstreamError(
        `DataForSEO HTTP ${res.status}`,
        res.status,
        envelope?.status_code,
        envelope?.status_message,
      );
    }

    // DataForSEO uses 20000 as success on the envelope. 4xx-equivalents come
    // back with HTTP 200 + status_code != 20000.
    if (envelope.status_code !== 20000) {
      await logCall({
        endpoint,
        handle: ownerHandle,
        actor: actorLabel,
        status: "error",
        httpStatus: res.status,
        durationMs,
        estimatedCostUsd: ESTIMATED_COST_USD[endpoint],
        actualCostUsd: extractActualCost(envelope),
        errorExcerpt: `${envelope.status_code}: ${envelope.status_message}`,
      });
      throw new DataForSeoUpstreamError(
        `DataForSEO API ${envelope.status_code}: ${envelope.status_message}`,
        res.status,
        envelope.status_code,
        envelope.status_message,
      );
    }

    await logCall({
      endpoint,
      handle: ownerHandle,
      actor: actorLabel,
      status: "success",
      httpStatus: res.status,
      durationMs,
      estimatedCostUsd: ESTIMATED_COST_USD[endpoint],
      actualCostUsd: extractActualCost(envelope),
      errorExcerpt: null,
    });

    return envelope;
  } catch (err) {
    if (err instanceof DataForSeoUpstreamError) throw err;
    if (err instanceof DataForSeoBlockedError) throw err;
    if (err instanceof DataForSeoConfigError) throw err;
    const message = err instanceof Error ? err.message : "unknown_error";
    await logCall({
      endpoint,
      handle: ownerHandle,
      actor: actorLabel,
      status: "error",
      httpStatus: null,
      durationMs: Date.now() - startedAt,
      estimatedCostUsd: ESTIMATED_COST_USD[endpoint],
      actualCostUsd: 0,
      errorExcerpt: message.slice(0, 500),
    });
    throw new DataForSeoUpstreamError(message, 0);
  } finally {
    clearTimeout(timer);
  }
}

/* -------------------------------------------------------------------------- */
/* Logging                                                                    */
/* -------------------------------------------------------------------------- */

interface LogInput {
  endpoint: DataForSeoEndpoint;
  handle: string;
  actor: string;
  status: "success" | "error" | "blocked";
  httpStatus: number | null;
  durationMs: number;
  estimatedCostUsd: number;
  actualCostUsd: number;
  errorExcerpt: string | null;
}

async function logCall(input: LogInput): Promise<void> {
  try {
    await supabaseAdmin.from("provider_call_logs").insert({
      provider: "dataforseo",
      actor: input.actor,
      network: "google",
      handle: input.handle,
      status: input.status,
      http_status: input.httpStatus,
      duration_ms: input.durationMs,
      posts_returned: 0,
      estimated_cost_usd: input.estimatedCostUsd,
      actual_cost_usd: input.actualCostUsd,
      error_excerpt: input.errorExcerpt,
    });
  } catch (err) {
    // Never let logging failures break the caller.
    console.error("[dataforseo] failed to log provider call", err);
  }
}