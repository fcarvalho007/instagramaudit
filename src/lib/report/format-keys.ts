/**
 * Canonical format-key normalisation shared by the single-profile
 * format card and the competitor format-compare card. Single source of
 * truth so both sides classify Reels / Carousels / Imagens identically.
 */
export type CanonicalFormatKey = "Reels" | "Carousels" | "Imagens";

export function normaliseFormatKey(raw: string | null | undefined): CanonicalFormatKey | null {
  const s = (raw ?? "").toLowerCase();
  if (s.startsWith("reel")) return "Reels";
  if (s.startsWith("carro") || s.startsWith("carou")) return "Carousels";
  if (s.startsWith("imag")) return "Imagens";
  return null;
}