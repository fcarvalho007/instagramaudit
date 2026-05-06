/**
 * Fetch Instagram CDN thumbnails and convert to base64 data URLs.
 *
 * Called during base analysis while CDN URLs are still fresh.
 * The resulting map is persisted in the snapshot payload so that
 * async enrichments (e.g. visual_cover) can use the images even
 * after CDN tokens expire.
 *
 * Server-only. Never import from client code.
 */

const LOG = "[thumbnail-cache]";
const FETCH_TIMEOUT_MS = 8_000;
const MAX_THUMBNAILS = 12;
const MAX_SIZE_BYTES = 500_000; // skip images > 500KB

/**
 * Fetch up to 12 thumbnails and return a map of { url → data:image/...;base64,... }.
 * Best-effort: failed fetches are silently skipped.
 */
export async function prefetchThumbnailsAsBase64(
  thumbnailUrls: string[],
): Promise<Record<string, string>> {
  const urls = thumbnailUrls.slice(0, MAX_THUMBNAILS);
  if (urls.length === 0) return {};

  const results: Record<string, string> = {};

  // Fetch in parallel with individual timeouts
  const tasks = urls.map(async (url) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const res = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Referer: "https://www.instagram.com/",
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) return;

      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      if (!contentType.startsWith("image/")) return;

      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_SIZE_BYTES) return;

      // Convert to base64 data URL
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const b64 = btoa(binary);
      results[url] = `data:${contentType};base64,${b64}`;
    } catch {
      // silently skip failed fetches
    }
  });

  await Promise.allSettled(tasks);

  console.info(
    LOG,
    `prefetched ${Object.keys(results).length}/${urls.length} thumbnails`,
  );

  return results;
}