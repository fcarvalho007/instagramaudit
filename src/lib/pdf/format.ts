/**
 * Locale-friendly formatters for PDF rendering.
 * Keeps numbers compact and pt-PT aligned (decimal comma, thin space groups).
 */

const PT_LOCALE = "pt-PT";

export function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  }
  if (n >= 10_000) {
    return `${Math.round(n / 1_000)}K`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1).replace(".", ",")}K`;
  }
  return new Intl.NumberFormat(PT_LOCALE).format(n);
}

export function formatInt(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(PT_LOCALE).format(Math.round(n));
}

export function formatPercent(
  n: number | null | undefined,
  fractionDigits = 2,
): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return `${n.toFixed(fractionDigits).replace(".", ",")}%`;
}

export function formatSignedPercent(
  n: number | null | undefined,
  fractionDigits = 1,
): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(fractionDigits).replace(".", ",")}%`;
}

export function formatLongDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(PT_LOCALE, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatShortDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(PT_LOCALE, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * Initials for avatar fallback. Uses the display name if available,
 * otherwise the first two characters of the username.
 */
export function deriveInitials(displayName: string, username: string): string {
  const source = (displayName || username || "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
