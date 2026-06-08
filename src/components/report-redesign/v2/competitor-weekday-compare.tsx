import { useMemo } from "react";
import { CompareBarPair, CompareCardShell } from "@/components/report-redesign/v2/compare";
import type { CompareBarCategory } from "@/components/report-redesign/v2/compare/compare-types";
import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";
import type { SnapshotPayload, SnapshotPost } from "@/lib/report/snapshot-to-report-data";
import { remapUtcCountsToIso } from "@/lib/report/weekday-iso";

interface Props {
  primaryHandle: string;
  primaryAvatarUrl?: string | null;
  primaryFullName?: string | null;
  primaryVerified?: boolean;
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
export function CompetitorWeekdayCompare({
  primaryHandle,
  primaryAvatarUrl,
  primaryFullName,
  primaryVerified,
  payload,
  competitor,
}: Props) {
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

  const insight = buildWeekdayInsight(
    primaryIso,
    competitorIso,
    totalPrimary,
    totalCompetitor,
  );

  return (
    <CompareCardShell
      title="Ritmo por dia da semana"
      subtitle="Publicações por dia (Seg–Dom)"
      density="hero"
      windowAligned={competitor.windowAligned}
      primary={{
        handle: primaryHandle,
        avatarUrl: primaryAvatarUrl ?? null,
        isVerified: Boolean(primaryVerified),
        displayName: primaryFullName ?? null,
      }}
      competitor={{
        handle: competitor.username,
        avatarUrl: competitor.avatarUrl ?? null,
        isVerified: competitor.isVerified,
        displayName: competitor.displayName,
      }}
      footer={insight ?? undefined}
    >
      <CompareBarPair
        variant="bare"
        label="Ritmo por dia da semana"
        primaryHandle={primaryHandle}
        competitorHandle={competitor.username}
        primaryAvatarUrl={primaryAvatarUrl ?? null}
        competitorAvatarUrl={competitor.avatarUrl ?? null}
        categories={categories}
        unit="abs"
        zeroLabel="Sem publicações"
        highlightWinner
      />
    </CompareCardShell>
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

/**
 * Deterministic peak-day insight. Skips when either side has fewer than
 * 3 posts in the window — too small to claim a pattern.
 */
function buildWeekdayInsight(
  primaryIso: number[],
  competitorIso: number[],
  totalPrimary: number,
  totalCompetitor: number,
): string | null {
  if (totalPrimary < 3 || totalCompetitor < 3) return null;
  const pIdx = peakIndex(primaryIso);
  const cIdx = peakIndex(competitorIso);
  if (pIdx === -1 || cIdx === -1) return null;
  const pDay = WEEKDAY_LABELS[pIdx].long;
  const cDay = WEEKDAY_LABELS[cIdx].long;
  if (pIdx === cIdx) {
    return `Os dois perfis concentram publicações em ${pDay.toLowerCase()}.`;
  }
  return `Tu publicas mais em ${pDay.toLowerCase()}; o concorrente em ${cDay.toLowerCase()}.`;
}

function peakIndex(arr: number[]): number {
  let best = -1;
  let bestVal = 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > bestVal) {
      bestVal = arr[i];
      best = i;
    }
  }
  return best;
}