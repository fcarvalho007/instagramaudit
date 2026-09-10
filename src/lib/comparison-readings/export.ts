import { readProfileExperiments } from "./profile-experiments";
import { StoredComparisonCollectionSchema, type StoredComparisonReadings } from "./types";
/** Read exactly the persisted result; export never regenerates or reinterprets it. */
export function comparisonExportSections(payload: unknown): StoredComparisonReadings[] {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  const parsed = StoredComparisonCollectionSchema.safeParse(p.ai_comparison_readings_v2);
  if (!parsed.success) {
    if (
      Array.isArray(p.competitors) &&
      p.competitors.some((c) => c && c.success !== false && c.profile?.username)
    )
      return [];
    const cards = readProfileExperiments(p);
    const handle = (p.profile as { username?: string })?.username ?? "perfil";
    return p.comparison_version === 2 && cards.length
      ? [
          {
            version: "1",
            model: "deterministic",
            prompt_version: "profile-experiments.v2",
            evidence_hash: "",
            competitor_handle: handle,
            window: String(p.analysis_window ?? "baseline"),
            generated_at: String(p.analysis_window_end ?? ""),
            status: "ready",
            readings: {
              version: "1",
              language: "pt-PT",
              global_summary: {
                headline: "Experiências propostas",
                key_reading: "Baseadas nas publicações do perfil",
                confidence: "low",
              },
              cards,
            },
          },
        ]
      : [];
  }
  const accounts = (Array.isArray(p.competitors) ? p.competitors : []).flatMap((c: unknown) => {
    if (!c || typeof c !== "object") return [];
    const v = c as { success?: boolean; profile?: { username?: string } };
    return v.success !== false && v.profile?.username ? [v.profile.username.toLowerCase()] : [];
  });
  return accounts.slice(0, 2).flatMap((handle) => {
    const entry = parsed.data.by_competitor[handle];
    return entry?.status === "ready" &&
      entry.readings &&
      entry.competitor_handle.toLowerCase() === handle &&
      (entry.window ?? "baseline") === (p.analysis_window ?? "baseline")
      ? [entry]
      : [];
  });
}
