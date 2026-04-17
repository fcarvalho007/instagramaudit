/**
 * Analysis snapshot cache layer.
 *
 * Server-only helpers for the public analysis endpoint. Computes a
 * deterministic cache key, looks up non-expired snapshots, persists fresh
 * results, and exposes a stale fallback for resilient error handling.
 *
 * Never import from client code — uses the service-role Supabase client.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

/** Cache TTL: snapshots are reused for 24h before triggering a new scrape. */
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Stale tolerance: on provider failure we may serve a snapshot up to 7 days old. */
export const STALE_TOLERANCE_MS = 7 * 24 * 60 * 60 * 1000;

/** Cache key version prefix — bump to invalidate every cached entry at once. */
const CACHE_KEY_VERSION = "v1";

/**
 * Build a deterministic, human-readable cache key.
 *
 * Competitors are lowercased and sorted alphabetically so that
 * `(nike, [adidas, puma])` and `(nike, [puma, adidas])` collapse to the
 * same entry — comparison output is order-independent in v1.
 */
export function buildCacheKey(
  primary: string,
  competitors: string[],
): string {
  const p = primary.toLowerCase();
  const c = [...competitors].map((s) => s.toLowerCase()).sort();
  return `${CACHE_KEY_VERSION}:${p}|${c.join(",")}`;
}

export interface SnapshotRow {
  id: string;
  cache_key: string;
  instagram_username: string;
  competitor_usernames: unknown;
  normalized_payload: Record<string, unknown>;
  provider: string;
  analysis_status: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

/** Look up a snapshot by cache key. Returns null if absent or on lookup error. */
export async function lookupSnapshot(
  cacheKey: string,
): Promise<SnapshotRow | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("analysis_snapshots")
      .select("*")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (error) {
      console.error("[analysis/cache] lookup error", error.message);
      return null;
    }
    return (data as SnapshotRow | null) ?? null;
  } catch (err) {
    console.error("[analysis/cache] lookup exception", err);
    return null;
  }
}

/** True when the snapshot's expires_at is still in the future. */
export function isFresh(snapshot: SnapshotRow): boolean {
  return new Date(snapshot.expires_at).getTime() > Date.now();
}

/** True when the snapshot is expired but within the stale tolerance window. */
export function isWithinStaleWindow(snapshot: SnapshotRow): boolean {
  const age = Date.now() - new Date(snapshot.created_at).getTime();
  return age < STALE_TOLERANCE_MS;
}

/**
 * Upsert a fresh snapshot keyed by cache_key.
 * Errors are logged but never thrown — caching is best-effort, the response
 * to the user must succeed even if persistence fails.
 */
export async function storeSnapshot(params: {
  cacheKey: string;
  instagramUsername: string;
  competitorUsernames: string[];
  normalizedPayload: Record<string, unknown>;
}): Promise<void> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
  try {
    const { error } = await supabaseAdmin
      .from("analysis_snapshots")
      .upsert(
        {
          cache_key: params.cacheKey,
          instagram_username: params.instagramUsername,
          competitor_usernames: params.competitorUsernames,
          normalized_payload: params.normalizedPayload,
          provider: "apify",
          analysis_status: "ready",
          expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "cache_key" },
      );
    if (error) {
      console.error("[analysis/cache] store error", error.message);
    }
  } catch (err) {
    console.error("[analysis/cache] store exception", err);
  }
}
