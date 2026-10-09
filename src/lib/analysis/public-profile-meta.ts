/**
 * Pure parser for the public Open Graph tags that Instagram serves to
 * logged-out visitors. Used ONLY for restricted profiles, where the data
 * providers return nothing: it yields the profile shell (name + public
 * counters) and never any post.
 */

export interface PartialProfile {
  handle: string;
  fullName: string | null;
  followers: number | null;
  following: number | null;
  posts: number | null;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
};

export function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const isHex = body[1]?.toLowerCase() === "x";
      const code = Number.parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** "2,781" → 2781 · "12.5K" → 12500 · "1.2M" → 1200000. */
export function parseCompactCount(raw: string): number | null {
  const text = raw.trim().replace(/\s/g, "");
  const match = /^([\d.,]+)([KMB])?$/i.exec(text);
  if (!match) return null;
  const suffix = match[2]?.toUpperCase();
  if (!suffix) {
    const n = Number.parseInt(match[1].replace(/[.,]/g, ""), 10);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number.parseFloat(match[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const mult = suffix === "K" ? 1e3 : suffix === "M" ? 1e6 : 1e9;
  return Math.round(n * mult);
}

function metaContent(html: string, property: string): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const prop = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    if (prop !== property) continue;
    const content = /\bcontent\s*=\s*"([^"]*)"/i.exec(tag)?.[1];
    if (content !== undefined) return decodeHtmlEntities(content);
  }
  return null;
}

function counter(description: string, label: string): number | null {
  const m = new RegExp(`([\\d.,]+\\s*[KMB]?)\\s+${label}`, "i").exec(description);
  return m ? parseCompactCount(m[1]) : null;
}

/** Returns null unless the page really describes this exact handle. */
export function parsePublicProfileMeta(
  html: string,
  handle: string,
): PartialProfile | null {
  const title = metaContent(html, "og:title");
  const description = metaContent(html, "og:description");
  if (!title || !description) return null;

  const wanted = handle.toLowerCase();
  const titleHandle = /\(@([A-Za-z0-9._]+)\)/.exec(title)?.[1]?.toLowerCase();
  if (titleHandle !== wanted) return null;

  const followers = counter(description, "Followers?");
  const following = counter(description, "Following");
  const posts = counter(description, "Posts?");
  if (followers === null && following === null && posts === null) return null;

  const name = title.split(/\s*\(@/)[0]?.trim() ?? "";
  return {
    handle: wanted,
    fullName: name.length > 0 ? name : null,
    followers,
    following,
    posts,
  };
}
