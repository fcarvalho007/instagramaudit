export function publicationUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value);
    if (u.protocol !== "https:" || !["instagram.com", "www.instagram.com"].includes(u.hostname))
      return null;
    if (!/^\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?$/.test(u.pathname)) return null;
    return `${u.origin}${u.pathname}`;
  } catch {
    return null;
  }
}
