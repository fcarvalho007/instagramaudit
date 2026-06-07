/**
 * Remap a 7-slot UTC weekday-count array (0=Sun .. 6=Sat — the shape
 * `analyze-public-v1.ts` produces from `post.weekday`) to a 7-slot ISO
 * weekday-count array (Mon=0 .. Sun=6 — the order
 * `frequency-card.aggregateByWeekday` uses for visual alignment).
 *
 * Mapping: utc[0]=Sun -> iso[6]; utc[1..6]=Mon..Sat -> iso[0..5].
 *
 * Values that are missing, non-finite or negative collapse to 0; the
 * output is always a fresh array of length 7.
 */
export function remapUtcCountsToIso(utc: readonly number[] | null | undefined): number[] {
  const iso = [0, 0, 0, 0, 0, 0, 0];
  if (!Array.isArray(utc)) return iso;
  for (let i = 0; i < 7 && i < utc.length; i++) {
    const raw = utc[i];
    const value =
      typeof raw === "number" && Number.isFinite(raw) && raw > 0
        ? Math.floor(raw)
        : 0;
    const isoIndex = i === 0 ? 6 : i - 1;
    iso[isoIndex] = value;
  }
  return iso;
}