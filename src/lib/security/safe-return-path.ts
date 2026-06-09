/**
 * Validates a client-supplied `return_path` / `return_url` as an internal
 * relative path. Blocks open-redirect vectors:
 *
 *   - absolute URLs (`https://evil.com/x`, `//evil.com/x`)
 *   - protocol-relative paths (`//evil.com`)
 *   - backslash tricks (`/\evil.com`)
 *   - scheme-prefixed strings (`javascript:`, `data:`, `mailto:` etc.)
 *   - non-string / empty inputs
 *
 * Returns the cleaned path, or the provided fallback (default `/`) when the
 * input is unsafe. Always starts with a single `/`.
 */
const MAX_LEN = 512;

export function safeReturnPath(input: unknown, fallback = "/"): string {
  if (typeof input !== "string") return fallback;
  const raw = input.trim();
  if (raw.length === 0 || raw.length > MAX_LEN) return fallback;
  // Must start with a single `/` and not be protocol-relative.
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (raw.startsWith("/\\")) return fallback;
  // Reject any embedded scheme delimiter or control chars.
  if (/[\x00-\x1f]/.test(raw)) return fallback;
  if (/^[/\\]*[a-z][a-z0-9+.-]*:/i.test(raw)) return fallback;
  // Whitelist of safe path/query/fragment characters.
  if (!/^\/[A-Za-z0-9/_\-.~!$&'()*+,;=:@?#%]*$/.test(raw)) return fallback;
  return raw;
}

export function isSafeReturnPath(input: unknown): boolean {
  return safeReturnPath(input, "__INVALID__") !== "__INVALID__";
}