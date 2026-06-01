/**
 * Single source of truth for which URL to render for a post thumbnail.
 *
 * Order:
 *   1. `thumbnail_storage_url` — persisted Supabase Storage URL (preferred,
 *      stable, no IG CDN dependency).
 *   2. `thumbnail_url` — original Apify/Instagram CDN URL. Still works from
 *      the browser even when our server fetch is 403'd.
 *   3. `thumbnailUrl` — camelCase alias used by some report components.
 *   4. `null` — caller renders fallback icon.
 */
export function pickThumbnailUrl(p: {
  thumbnail_storage_url?: string | null;
  thumbnail_url?: string | null;
  thumbnailUrl?: string | null;
}): string | null {
  return (
    (typeof p.thumbnail_storage_url === "string" && p.thumbnail_storage_url) ||
    (typeof p.thumbnail_url === "string" && p.thumbnail_url) ||
    (typeof p.thumbnailUrl === "string" && p.thumbnailUrl) ||
    null
  );
}