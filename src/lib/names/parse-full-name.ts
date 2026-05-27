/**
 * Pure helper to split a single "full name" input into parts.
 *
 * Used by the lead-magnet unlock flow, where the user fills a single
 * "Primeiro e último nome" field. We still need first_name for email
 * personalization ("Olá Ana,") and last_name for CRM/admin contexts.
 *
 * Behavior:
 * - trims leading/trailing whitespace
 * - collapses runs of whitespace to a single space
 * - first_name = first whitespace-separated token
 * - last_name = the rest, joined with single spaces, or null when only one token
 * - full_name = the cleaned input (original casing preserved)
 *
 * Accepts accents, hyphens, apostrophes, and any Unicode word characters.
 * Returns null/empty for empty inputs — callers should validate non-empty
 * upstream (Zod min(2)).
 */
export interface ParsedName {
  full_name: string;
  first_name: string;
  last_name: string | null;
}

export function parseFullName(input: string | null | undefined): ParsedName {
  const raw = (input ?? "").replace(/\s+/g, " ").trim();
  if (!raw) {
    return { full_name: "", first_name: "", last_name: null };
  }
  const parts = raw.split(" ");
  const first = parts[0];
  const rest = parts.slice(1).join(" ");
  return {
    full_name: raw,
    first_name: first,
    last_name: rest.length > 0 ? rest : null,
  };
}