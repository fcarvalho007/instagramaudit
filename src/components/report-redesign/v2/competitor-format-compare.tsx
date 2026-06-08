import { CompareBarPair } from "@/components/report-redesign/v2/compare";
import type { CompareBarCategory } from "@/components/report-redesign/v2/compare/compare-types";
import type { FormatEntry } from "@/components/report-redesign/v2/overview/format-card";
import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";
import { normaliseFormatKey, type CanonicalFormatKey } from "@/lib/report/format-keys";

interface Props {
  primaryHandle: string;
  /** Already-computed primary format entries (Reels / Carousels / Imagens). */
  formats: FormatEntry[];
  // TODO: multi-competitor layout (Fase 1.5) — today only the first
  // competitor is rendered.
  competitor: ReportCompetitorBreakdownEntry;
}

const CATEGORY_ORDER: Array<{ key: CanonicalFormatKey; label: string }> = [
  { key: "Reels", label: "Reels" },
  { key: "Carousels", label: "Carrosséis" },
  { key: "Imagens", label: "Imagens" },
];

/**
 * Pro-only "Profile vs Competitor" format-mix comparison.
 *
 * Replaces FormatCard when a competitor is present. Uses share_pct
 * (already normalised upstream) on both sides so the bars are honest
 * across two profiles with different sample sizes.
 *
 * Renders nothing — letting the parent fall back to the single-profile
 * FormatCard — when the competitor has no usable format_stats.
 */
export function CompetitorFormatCompare({ primaryHandle, formats, competitor }: Props) {
  const competitorShares = buildCompetitorShares(competitor.formatStats);
  const primaryShares = buildPrimaryShares(formats);

  const categories: CompareBarCategory[] = CATEGORY_ORDER.map(({ key, label }) => {
    const primary = primaryShares.get(key) ?? 0;
    const compShare = competitorShares.get(key) ?? 0;
    return {
      key,
      label,
      primary,
      competitor: compShare,
      primaryFormatted: fmtPct(primary),
      competitorFormatted: fmtPct(compShare),
    };
  }).filter((c) => c.primary > 0 || c.competitor > 0);

  if (categories.length === 0) return null;

  const insight = buildFormatInsight(categories);

  return (
    <section
      className="rounded-2xl border border-border-default bg-surface-primary shadow-card p-5 sm:p-6"
      aria-label="Mix de formatos: comparação com concorrente"
    >
      <header className="flex flex-col gap-2 mb-4">
        <h3 className="font-serif text-xl sm:text-2xl text-content-primary leading-snug">
          Mix de formatos
        </h3>
        {!competitor.windowAligned ? (
          <span className="inline-flex w-fit items-center rounded-full border border-border-subtle bg-surface-muted px-2.5 py-0.5 text-xs text-content-tertiary">
            Concorrente em janela baseline.
          </span>
        ) : null}
      </header>
      <CompareBarPair
        variant="bare"
        label="Mix de formatos"
        primaryHandle={primaryHandle}
        competitorHandle={competitor.username}
        categories={categories}
        unit="percent"
      />
      {insight ? (
        <p className="mt-4 rounded-xl border border-border-subtle bg-surface-muted px-4 py-3 text-sm text-content-secondary leading-relaxed">
          {insight}
        </p>
      ) : null}
    </section>
  );
}

function buildPrimaryShares(formats: FormatEntry[]): Map<CanonicalFormatKey, number> {
  const map = new Map<CanonicalFormatKey, number>();
  for (const f of formats) {
    const key = normaliseFormatKey(f.format);
    if (!key) continue;
    const share = typeof f.sharePct === "number" && Number.isFinite(f.sharePct) ? f.sharePct : 0;
    map.set(key, (map.get(key) ?? 0) + share);
  }
  return map;
}

function buildCompetitorShares(
  stats: ReportCompetitorBreakdownEntry["formatStats"],
): Map<CanonicalFormatKey, number> {
  const map = new Map<CanonicalFormatKey, number>();
  if (!stats) return map;
  for (const [rawKey, v] of Object.entries(stats)) {
    const key = normaliseFormatKey(rawKey);
    if (!key) continue;
    const share = typeof v?.share_pct === "number" && Number.isFinite(v.share_pct) ? v.share_pct : 0;
    if (share <= 0) continue;
    map.set(key, (map.get(key) ?? 0) + share);
  }
  return map;
}

function fmtPct(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 %";
  return `${value.toLocaleString("pt-PT", { maximumFractionDigits: 1 })} %`;
}

/**
 * Deterministic, non-inventive insight. Returns null when the gap on
 * the dominant primary format is under 10 pp — we don't claim a
 * pattern that isn't there.
 */
function buildFormatInsight(categories: CompareBarCategory[]): string | null {
  if (categories.length === 0) return null;
  const primaryDominant = [...categories].sort((a, b) => b.primary - a.primary)[0];
  const competitorDominant = [...categories].sort((a, b) => b.competitor - a.competitor)[0];
  if (!primaryDominant || !competitorDominant) return null;

  const gapOnCompetitorDominant = competitorDominant.competitor - competitorDominant.primary;
  if (gapOnCompetitorDominant >= 10) {
    return `O concorrente investe muito mais em ${competitorDominant.label} — ${fmtPct(
      competitorDominant.competitor,
    )} contra os teus ${fmtPct(competitorDominant.primary)}. Pode explicar parte da diferença de envolvimento.`;
  }

  const gapOnPrimaryDominant = primaryDominant.primary - primaryDominant.competitor;
  if (gapOnPrimaryDominant >= 10) {
    return `Este perfil investe mais em ${primaryDominant.label} (${fmtPct(
      primaryDominant.primary,
    )} vs ${fmtPct(primaryDominant.competitor)}).`;
  }

  return null;
}