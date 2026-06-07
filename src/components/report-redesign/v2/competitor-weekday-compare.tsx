import { useMemo } from "react";
import { CompareBarPair } from "@/components/report-redesign/v2/compare";
import type { CompareBarCategory } from "@/components/report-redesign/v2/compare/compare-types";
import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";
import type { SnapshotPayload, SnapshotPost } from "@/lib/report/snapshot-to-report-data";
import { remapUtcCountsToIso } from "@/lib/report/weekday-iso";

interface Props {
  primaryHandle: string;
  /** Raw snapshot payload — used to derive the primary weekday counts
   * from the same `weekday` field competitors are aggregated from
   * (analyze-public-v1.ts: `enrichPosts(...).posts[i].weekday`). */
  payload: SnapshotPayload | null | undefined;
  // TODO: multi-competitor layout (Fase 1.5) — today only the first
  // competitor is rendered.
  competitor: ReportCompetitorBreakdownEntry;
}

const WEEKDAY_LABELS: Array<{ short: string; long: string }> = [
  { short: "Seg", long: "Segunda" },
  { short: "Ter", long: "Terça" },
  { short: "Qua", long: "Quarta" },
  { short: "Qui", long: "Quinta" },
  { short: "Sex", long: "Sexta" },
  { short: "Sáb", long: "Sábado" },
  { short: "Dom", long: "Domingo" },
];

/**
 * Pro-only "Profile vs Competitor" weekday-rhythm comparison.
 *
 * Sibling card stacked under CompetitorCadenceCompare in the
 * Frequency section. Distribution-style — paired absolute counts per
 * ISO weekday (Mon..Sun) so the two cadence shapes are visible.
 *
 * Returns null (parent renders nothing extra) when neither side has
 * usable data.
 */
export function CompetitorWeekdayCompare({ primaryHandle, payload, competitor }: Props) {
  const primaryIso = useMemo(() => derivePrimaryIso(payload?.posts), [payload?.posts]);
  const competitorIso = useMemo(
    () => normaliseIso(competitor.weekdayCountsIso),
    [competitor.weekdayCountsIso],
  );

  const totalPrimary = primaryIso.reduce((s, n) => s + n, 0);
  const totalCompetitor = competitorIso.reduce((s, n) => s + n, 0);
  if (totalPrimary === 0 && totalCompetitor === 0) return null;

  const categories: CompareBarCategory[] = WEEKDAY_LABELS.map((d, i) => ({
    key: d.long,
    label: d.short,
    primary: primaryIso[i] ?? 0,
    competitor: competitorIso[i] ?? 0,
  }));

  const hint = !competitor.windowAligned
    ? "Concorrente em janela baseline · publicações por dia da semana"
    : "Publicações por dia da semana";

  return (
    <CompareBarPair
      label="Ritmo por dia da semana"
      primaryHandle={primaryHandle}
      competitorHandle={competitor.username}
      categories={categories}
      unit="abs"
      hint={hint}
    />
  );
}

/** Aggregate primary posts by UTC weekday, then remap to ISO Mon..Sun.
 *  Mirrors the competitor pipeline in analyze-public-v1.ts:1131-1136. */
function derivePrimaryIso(posts: SnapshotPost[] | null | undefined): number[] {
  if (!Array.isArray(posts) || posts.length === 0) return [0, 0, 0, 0, 0, 0, 0];
  const utc = [0, 0, 0, 0, 0, 0, 0];
  for (const p of posts) {
    const w = p?.weekday;
    if (typeof w !== "number" || !Number.isFinite(w)) continue;
    if (w < 0 || w > 6) continue;
    utc[w] += 1;
  }
  return remapUtcCountsToIso(utc);
}

function normaliseIso(raw: number[] | null | undefined): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0];
  if (!Array.isArray(raw)) return out;
  for (let i = 0; i < 7 && i < raw.length; i++) {
    const v = raw[i];
    out[i] = typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  }
  return out;
}