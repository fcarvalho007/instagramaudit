/**
 * Derive seed keywords for DataForSEO from a (real) Apify snapshot payload.
 *
 * Strategy:
 *   1. Top hashtags from `posts[].hashtags` (without "#"), via the
 *      existing `extractTopHashtags` aggregator.
 *   2. Top caption keywords (pt-PT) via `extractTopKeywords` as fallback /
 *      complement when hashtags are too few or too generic.
 *   3. Profile display name as a last-resort brand keyword.
 *
 * Output is lowercase, deduplicated, length-limited and capped to `limit`.
 * Pure: no DB, no network. Safe to call from server functions.
 */
import {
  extractTopHashtags,
  extractTopKeywords,
  type PostForText,
} from "@/lib/report/text-extract";
import type { SnapshotPayload, SnapshotPost } from "@/lib/report/snapshot-to-report-data";

const MIN_LEN = 2;
const MAX_LEN = 60;

/** Generic tags filtered out — too broad for SEO/SERP signal. */
const TOO_GENERIC = new Set<string>([
  "love", "instagood", "instagram", "photo", "photooftheday", "follow",
  "followme", "like4like", "amor", "vida", "dia", "foto", "fotografia",
  "portugal", "lisboa", "porto",
]);

function clean(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.replace(/^#/, "").trim().toLowerCase();
  if (trimmed.length < MIN_LEN || trimmed.length > MAX_LEN) return null;
  return trimmed;
}

function asPostsForText(posts: SnapshotPost[] | null | undefined): PostForText[] {
  if (!Array.isArray(posts)) return [];
  return posts.map((p) => ({
    caption: p.caption ?? null,
    hashtags: Array.isArray(p.hashtags) ? p.hashtags : null,
    engagement_pct:
      typeof p.engagement_pct === "number" ? p.engagement_pct : null,
  }));
}

/**
 * Returns up to `limit` deterministic seed keywords for DataForSEO.
 * Always returns at least an empty array; never throws.
 */
export function deriveKeywordsFromSnapshot(
  payload: SnapshotPayload | null | undefined,
  limit = 5,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string | null | undefined): void => {
    const k = clean(raw);
    if (!k || seen.has(k) || TOO_GENERIC.has(k)) return;
    seen.add(k);
    out.push(k);
  };

  const posts = asPostsForText(payload?.posts);

  // 1. Hashtags
  for (const row of extractTopHashtags(posts, 12)) {
    if (out.length >= limit) break;
    push(row.tag);
  }

  // 2. Caption keywords (only if we still need more)
  if (out.length < limit) {
    for (const row of extractTopKeywords(posts, 12)) {
      if (out.length >= limit) break;
      push(row.word);
    }
  }

  // 3. Display name fallback
  if (out.length === 0) {
    push(payload?.profile?.display_name ?? null);
    push(payload?.profile?.username ?? null);
  }

  return out.slice(0, Math.max(0, limit));
}