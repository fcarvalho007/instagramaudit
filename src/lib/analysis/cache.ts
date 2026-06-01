/**
 * Analysis snapshot cache layer.
 *
 * Server-only helpers for the public analysis endpoint. Computes a
 * deterministic cache key, looks up non-expired snapshots, persists fresh
 * results, and exposes a stale fallback for resilient error handling.
 *
 * Never import from client code — uses the service-role Supabase client.
 */

import type { EnrichmentStatusMap } from "@/lib/enrichment/types";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  CACHE_REUSE_MAX_MS,
  REFRESH_BUTTON_AFTER_MS,
  REPORT_RETENTION_MS,
} from "@/lib/report/retention";
import { persistThumbnailsInPayload } from "@/lib/report-snapshots/persist-thumbnails.server";

/**
 * Cache TTL — janela de reutilização "fresca" (24h). Acima disto, o
 * endpoint público corre fresh automaticamente e cai para o snapshot
 * existente apenas se a chamada falhar.
 */
export const CACHE_TTL_MS = CACHE_REUSE_MAX_MS;

/**
 * Stale tolerance: alinhado à janela de retenção do relatório (15 d).
 * Funciona como upper bound do que ainda é "histórico revisitável" e
 * janela máxima para fallback quando o provider falha.
 */
export const STALE_TOLERANCE_MS = REPORT_RETENTION_MS;

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

/**
 * Remove a top-level key from a snapshot's normalized_payload.
 * Uses read-delete-write via PostgREST.
 * Returns true on success, false on failure. Never throws.
 */
export async function removePayloadKey(
  snapshotId: string,
  key: string,
): Promise<boolean> {
  try {
    const { data: snapshot, error: fetchErr } = await supabaseAdmin
      .from("analysis_snapshots")
      .select("normalized_payload")
      .eq("id", snapshotId)
      .single();
    if (fetchErr || !snapshot) {
      console.error("[analysis/cache] removePayloadKey fetch error", fetchErr?.message);
      return false;
    }
    const payload = { ...(snapshot.normalized_payload as Record<string, unknown>) };
    if (!(key in payload)) return true; // already absent
    delete payload[key];
    const { error: updateErr } = await supabaseAdmin
      .from("analysis_snapshots")
      .update({
        normalized_payload: payload as never,
        updated_at: new Date().toISOString(),
      })
      .eq("id", snapshotId);
    if (updateErr) {
      console.error("[analysis/cache] removePayloadKey update error", updateErr.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[analysis/cache] removePayloadKey exception", err);
    return false;
  }
}

/**
 * Atomically set a single enrichment_status key using jsonb_set via RPC.
 * Safe against concurrent writers — no read-merge-write.
 */
export async function setEnrichmentStatusAtomic(
  snapshotId: string,
  key: string,
  value: string,
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin.rpc("set_enrichment_status", {
      p_snapshot_id: snapshotId,
      p_key: key,
      p_value: value,
    });
    if (error) {
      console.error("[analysis/cache] setEnrichmentStatusAtomic error", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[analysis/cache] setEnrichmentStatusAtomic exception", err);
    return false;
  }
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
 * Estado de frescura derivado da idade do snapshot. Usado pelo endpoint
 * público para decidir se mostra o CTA "Actualizar análise" e pelo
 * frontend para textos como "Actualizado hoje".
 */
export type FreshnessState =
  | "fresh_under_12h"
  | "fresh_12_to_24h"
  | "expired";

export function getFreshnessState(snapshot: SnapshotRow): FreshnessState {
  const age = Date.now() - new Date(snapshot.created_at).getTime();
  if (age < REFRESH_BUTTON_AFTER_MS) return "fresh_under_12h";
  if (age < CACHE_REUSE_MAX_MS) return "fresh_12_to_24h";
  return "expired";
}

export function getSnapshotAgeHours(snapshot: SnapshotRow): number {
  const ageMs = Date.now() - new Date(snapshot.created_at).getTime();
  return Math.max(0, Math.round((ageMs / 3_600_000) * 10) / 10);
}

/**
 * Upsert a fresh snapshot keyed by cache_key.
 * Returns the snapshot's id so callers can echo it back to the client and
 * link future report requests to this exact row. Errors are logged but never
 * thrown — caching is best-effort, the response must succeed even on failure.
 */
export async function storeSnapshot(params: {
  cacheKey: string;
  instagramUsername: string;
  competitorUsernames: string[];
  normalizedPayload: Record<string, unknown>;
}): Promise<string | null> {
  const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
  try {
    // Persiste thumbnails/avatar do CDN do IG no nosso bucket público antes
    // de guardar. Mutaciona `normalizedPayload.posts[*].thumbnail_url` e
    // `normalizedPayload.profile.avatar_url`. Best-effort — falhas individuais
    // ficam `null` e o componente cai no fallback visual.
    try {
      const t0 = Date.now();
      const payload = params.normalizedPayload as {
        posts?: Array<{ thumbnail_url?: unknown }>;
        profile?: { avatar_url?: unknown };
      };
      const postsArr = Array.isArray(payload?.posts) ? payload.posts : [];
      const postsWithThumb = postsArr.filter(
        (p) => typeof p?.thumbnail_url === "string" && p.thumbnail_url,
      ).length;
      const hasAvatar =
        typeof payload?.profile?.avatar_url === "string" &&
        !!payload.profile.avatar_url;
      const deployMarker =
        process.env.CF_PAGES_COMMIT_SHA?.slice(0, 7) ??
        process.env.WORKER_VERSION ??
        process.env.NODE_ENV ??
        "unknown";
      console.log(
        `[thumbnails] start handle=${params.instagramUsername} cache_key=${params.cacheKey} posts=${postsArr.length} posts_with_thumb=${postsWithThumb} has_avatar=${hasAvatar} deploy=${deployMarker}`,
      );
      const s = await persistThumbnailsInPayload(
        params.cacheKey,
        params.normalizedPayload,
      );
      console.log(
        `[thumbnails] handle=${params.instagramUsername} cache_key=${params.cacheKey} attempted=${s.attempted} stored=${s.stored} failed_403=${s.failed_403} failed_timeout=${s.failed_timeout} failed_invalid_content_type=${s.failed_invalid_content_type} failed_upload=${s.failed_upload} failed_other=${s.failed_other} avatar=${s.avatar} duration_ms=${Date.now() - t0}`,
      );
    } catch (thumbErr) {
      console.warn(
        "[analysis/cache] thumbnail persistence failed (continuing)",
        thumbErr,
      );
    }
    const row = {
      cache_key: params.cacheKey,
      instagram_username: params.instagramUsername,
      competitor_usernames: params.competitorUsernames,
      normalized_payload: params.normalizedPayload,
      provider: "apify",
      analysis_status: "ready",
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabaseAdmin
      .from("analysis_snapshots")
      // Cast: generated types treat upsert payload as InsertSingle which is
      // overly strict about mixing insert + update fields in one call.
      .upsert(row as never, { onConflict: "cache_key" })
      .select("id")
      .single();
    if (error) {
      console.error("[analysis/cache] store error", error.message);
      return null;
    }
    return (data as { id: string } | null)?.id ?? null;
  } catch (err) {
    console.error("[analysis/cache] store exception", err);
    return null;
  }
}

/**
 * Merge a partial patch into an existing snapshot's `normalized_payload`.
 * Uses read-merge-write to preserve all existing fields. Returns true on
 * success, false on failure. Never throws.
 */
export async function patchSnapshotPayload(
  snapshotId: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  try {
    const { data: snapshot, error: fetchErr } = await supabaseAdmin
      .from("analysis_snapshots")
      .select("normalized_payload")
      .eq("id", snapshotId)
      .single();
    if (fetchErr || !snapshot) {
      console.error("[analysis/cache] patchSnapshotPayload fetch error", fetchErr?.message);
      return false;
    }
    const existing = (snapshot.normalized_payload ?? {}) as Record<string, unknown>;
    // Deep-merge enrichment_status so individual keys aren't overwritten
    const merged = { ...existing, ...patch };
    if (
      patch.enrichment_status &&
      typeof patch.enrichment_status === "object" &&
      existing.enrichment_status &&
      typeof existing.enrichment_status === "object"
    ) {
      merged.enrichment_status = {
        ...(existing.enrichment_status as Record<string, unknown>),
        ...(patch.enrichment_status as Record<string, unknown>),
      };
    }
    const { error: updateErr } = await supabaseAdmin
      .from("analysis_snapshots")
      .update({
        normalized_payload: merged as never,
        updated_at: new Date().toISOString(),
      })
      .eq("id", snapshotId);
    if (updateErr) {
      console.error("[analysis/cache] patchSnapshotPayload update error", updateErr.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[analysis/cache] patchSnapshotPayload exception", err);
    return false;
  }
}
