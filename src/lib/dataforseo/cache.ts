/**
 * DataForSEO request cache backed by `provider_call_logs`.
 *
 * For a deterministic input we look at the most recent successful row in
 * the log table. If it is within the per-endpoint TTL we return its
 * normalized payload (stored in `error_excerpt` is NOT used — payload is
 * not persisted today). For the first iteration the cache is purely
 * "have we recently called this exact thing?" — used for idempotency and
 * cost guard. A separate snapshot table for payloads can come later.
 *
 * NOTE: To keep the schema unchanged this iteration we DO NOT cache
 * payloads — we only read the timestamp to enforce a "no duplicate call
 * inside TTL" rule. The actual response is always returned from the live
 * call. This guarantees correctness while still preventing accidental
 * burn loops.
 *
 * A future iteration may add a dedicated `dataforseo_payloads` table.
 */
import crypto from "node:crypto";
import type { DataForSeoEndpoint } from "./types";
import { CACHE_TTL_SECONDS } from "./types";

export function buildCacheKey(
  endpoint: DataForSeoEndpoint,
  input: unknown,
): string {
  const stable = stableStringify(input);
  return crypto
    .createHash("sha256")
    .update(`dataforseo:${endpoint}:${stable}`)
    .digest("hex")
    .slice(0, 32);
}

export function ttlFor(endpoint: DataForSeoEndpoint): number {
  return CACHE_TTL_SECONDS[endpoint];
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([a], [b]) => a.localeCompare(b),
  );
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`)
    .join(",")}}`;
}