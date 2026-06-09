import { useMemo } from "react";
import {
  CompareCardShell,
  CompareMissingDataNote,
  COMPARE_MISSING_COPY,
} from "@/components/report-redesign/v2/compare";
import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";
import type { SnapshotPayload, SnapshotPost } from "@/lib/report/snapshot-to-report-data";
import { remapUtcCountsToIso } from "@/lib/report/weekday-iso";
import { cn } from "@/lib/utils";

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
  const competitorFieldMissing = competitor.hasWeekdayData === false;
  const competitorHasData = !competitorFieldMissing && totalCompetitor > 0;
  if (totalPrimary === 0 && !competitorHasData) return null;

  const pPeak = peakIndex(primaryIso);
  const cPeak = competitorHasData ? peakIndex(competitorIso) : -1;
  const maxAcrossBoth = Math.max(
    1,
    ...primaryIso,
    ...(competitorHasData ? competitorIso : [0]),
  );

  const footer = competitorHasData
    ? buildWeekdayInsight(primaryIso, competitorIso, totalPrimary, totalCompetitor)
    : competitorFieldMissing
      ? COMPARE_MISSING_COPY.competitorMissing
      : COMPARE_MISSING_COPY.competitorNoPosts;

  const bothSidesHaveData = competitorHasData && totalPrimary > 0;
  const sampleN = bothSidesHaveData ? null : totalPrimary;
  const missingCopy = competitorFieldMissing
    ? COMPARE_MISSING_COPY.competitorMissing
    : !competitorHasData
      ? COMPARE_MISSING_COPY.competitorNoPosts
      : null;

  return (
    <CompareCardShell
      title="Ritmo por dia da semana"
      subtitle="Distribuição de publicações por dia (Seg–Dom)"
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
      footer={footer ?? undefined}
    >
      <div className="space-y-5">
        {/* Per-side peak chips */}
        <div className="flex flex-wrap gap-2">
          {totalPrimary >= 3 && pPeak !== -1 ? (
            <PeakChip
              side="primary"
              handle={primaryHandle}
              dayLong={WEEKDAY_LABELS[pPeak].long}
              share={Math.round((primaryIso[pPeak] / totalPrimary) * 100)}
            />
          ) : null}
          {competitorHasData && totalCompetitor >= 3 && cPeak !== -1 ? (
            <PeakChip
              side="competitor"
              handle={competitor.username}
              dayLong={WEEKDAY_LABELS[cPeak].long}
              share={Math.round((competitorIso[cPeak] / totalCompetitor) * 100)}
            />
          ) : null}
        </div>

        {/* Chart + (optional) missing-data panel side-by-side on md+ */}
        <div
          className={cn(
            "grid gap-4",
            competitorHasData ? "grid-cols-1" : "grid-cols-1 md:grid-cols-[1fr_minmax(200px,260px)]",
          )}
        >
          <div className="space-y-3 sm:space-y-3.5">
            {WEEKDAY_LABELS.map((d, i) => {
              const pv = primaryIso[i] ?? 0;
              const cv = competitorHasData ? competitorIso[i] ?? 0 : 0;
              return (
                <div
                  key={d.long}
                  className="grid grid-cols-[2.25rem_1fr_3.5rem] items-center gap-3"
                >
                  <span className="text-xs sm:text-sm font-medium text-content-secondary">
                    {d.short}
                  </span>
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <Bar
                      value={pv}
                      max={maxAcrossBoth}
                      fill="bg-accent-primary"
                      peak={i === pPeak && totalPrimary > 0}
                    />
                    {competitorHasData ? (
                      <Bar
                        value={cv}
                        max={maxAcrossBoth}
                        fill="bg-compare-competitor"
                        peak={i === cPeak}
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-0.5 text-xs sm:text-sm tabular-nums">
                    <span
                      className={cn(
                        "font-semibold",
                        i === pPeak && totalPrimary > 0
                          ? "text-accent-primary"
                          : "text-content-primary",
                      )}
                    >
                      {pv}
                      {i === pPeak && totalPrimary > 0 ? (
                        <span aria-hidden="true" className="ml-1 text-accent-primary">★</span>
                      ) : null}
                    </span>
                    {competitorHasData ? (
                      <span
                        className={cn(
                          "font-semibold",
                          i === cPeak ? "text-compare-competitor" : "text-content-secondary",
                        )}
                      >
                        {cv}
                        {i === cPeak ? (
                          <span aria-hidden="true" className="ml-1 text-compare-competitor">★</span>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {!competitorHasData ? (
            <aside
              role="note"
              className={cn(
                "flex flex-col justify-center gap-2 rounded-xl border border-dashed",
                "border-border-default/70 bg-surface-muted/40 p-4 text-center",
              )}
            >
              <span className="text-eyebrow-sm text-compare-competitor">
                Concorrente
              </span>
              <p className="text-sm text-content-secondary leading-relaxed">
                {missingCopy}
              </p>
            </aside>
          ) : null}
        </div>

        <CompareMissingDataNote
          sampleN={sampleN && sampleN > 0 ? sampleN : null}
          perSide={
            bothSidesHaveData
              ? {
                  primaryHandle,
                  primaryN: totalPrimary,
                  competitorHandle: competitor.username,
                  competitorN: totalCompetitor,
                }
              : null
          }
          competitorMissing={competitorFieldMissing}
          competitorNoPosts={!competitorFieldMissing && !competitorHasData}
        />
      </div>
    </CompareCardShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function Bar({
  value,
  max,
  fill,
  peak,
}: {
  value: number;
  max: number;
  fill: string;
  peak: boolean;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="relative h-3 w-full rounded-full bg-surface-muted overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-[width]",
          fill,
          peak ? "opacity-100" : "opacity-90",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PeakChip({
  side,
  handle,
  dayLong,
  share,
}: {
  side: "primary" | "competitor";
  handle: string;
  dayLong: string;
  share: number;
}) {
  const dotColor =
    side === "primary" ? "bg-accent-primary" : "bg-compare-competitor";
  const eyebrow = side === "primary" ? "Perfil" : "Concorrente";
  const eyebrowColor =
    side === "primary" ? "text-accent-primary" : "text-compare-competitor";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border-subtle bg-white px-3 py-1.5",
        "text-xs sm:text-sm text-content-secondary",
      )}
      aria-label={`${eyebrow} @${handle} — dia mais forte ${dayLong}, ${share} por cento`}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full shrink-0", dotColor)} />
      <span className={cn("text-eyebrow-sm", eyebrowColor)}>{eyebrow}</span>
      <span className="text-content-tertiary">·</span>
      <span>
        Dia mais forte: <span className="font-semibold text-content-primary">{dayLong}</span>{" "}
        <span className="tabular-nums">({share} %)</span>
      </span>
    </span>
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
  if (totalPrimary < 3 || totalCompetitor < 3) {
    return "Amostra pequena para concluir um padrão semanal estável.";
  }
  const pIdx = peakIndex(primaryIso);
  const cIdx = peakIndex(competitorIso);
  if (pIdx === -1 || cIdx === -1) return null;
  const pDay = WEEKDAY_LABELS[pIdx].long;
  const cDay = WEEKDAY_LABELS[cIdx].long;
  const pShare = Math.round((primaryIso[pIdx] / totalPrimary) * 100);
  const cShare = Math.round((competitorIso[cIdx] / totalCompetitor) * 100);
  if (pIdx === cIdx) {
    if (pShare >= cShare * 1.5) {
      return `Concentras mais o ritmo em ${pDay.toLowerCase()} (${pShare} % vs ${cShare} %).`;
    }
    if (cShare >= pShare * 1.5) {
      return `O concorrente concentra mais o ritmo em ${cDay.toLowerCase()} (${cShare} % vs ${pShare} %).`;
    }
    return `Os dois perfis concentram publicações em ${pDay.toLowerCase()} — ${pShare} % no teu lado, ${cShare} % no concorrente.`;
  }
  return `Tu concentras ${pShare} % das publicações em ${pDay.toLowerCase()}; o concorrente concentra ${cShare} % em ${cDay.toLowerCase()}.`;
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