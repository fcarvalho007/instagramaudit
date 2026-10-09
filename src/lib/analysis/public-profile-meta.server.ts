/**
 * Fetches the public Instagram page of ONE restricted handle and reads its
 * Open Graph tags. No login, no cookies, no session; failures return null.
 */

import { parsePublicProfileMeta, type PartialProfile } from "./public-profile-meta";

const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; value: PartialProfile | null }>();

export async function fetchPublicProfileMeta(
  handle: string,
): Promise<PartialProfile | null> {
  const hit = cache.get(handle);
  if (hit && Date.now() - hit.at < (hit.value ? TTL_MS : 60 * 1000)) {
    return hit.value;
  }

  let value: PartialProfile | null = null;
  try {
    const res = await fetch(`https://www.instagram.com/${encodeURIComponent(handle)}/`, {
      headers: {
        // A minimal UA gets the public Open Graph variant of the page; full
        // browser UAs are served the JS login shell without those tags.
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (res.ok) value = parsePublicProfileMeta(await res.text(), handle);
  } catch (err) {
    console.warn("[public-profile-meta] fetch failed", handle, err);
  }

  if (cache.size > 200) cache.clear();
  cache.set(handle, { at: Date.now(), value });
  return value;
}
