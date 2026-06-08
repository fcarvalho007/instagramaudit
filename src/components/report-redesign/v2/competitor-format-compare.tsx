import {
  CompareCardShell,
  CompareMissingDataNote,
} from "@/components/report-redesign/v2/compare";
import { CompareAvatar } from "@/components/report-redesign/v2/compare/compare-handle-row";
import type { FormatEntry } from "@/components/report-redesign/v2/overview/format-card";
import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";
import { normaliseFormatKey, type CanonicalFormatKey } from "@/lib/report/format-keys";
import { cn } from "@/lib/utils";

interface Props {
  primaryHandle: string;
  primaryAvatarUrl?: string | null;
  primaryFullName?: string | null;
  primaryVerified?: boolean;
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
export function CompetitorFormatCompare({
  primaryHandle,
  primaryAvatarUrl,
  primaryFullName,
  primaryVerified,
  formats,
  competitor,
}: Props) {
  const competitorShares = buildCompetitorShares(competitor.formatStats);
  const primaryShares = buildPrimaryShares(formats);

  const primaryEntries = CATEGORY_ORDER.map(({ key, label }) => ({
    key,
    label,
    share: primaryShares.get(key) ?? 0,
  }));
  const competitorEntries = CATEGORY_ORDER.map(({ key, label }) => ({
    key,
    label,
    share: competitorShares.get(key) ?? 0,
  }));

  const primaryTotal = primaryEntries.reduce((s, e) => s + e.share, 0);
  const competitorTotal = competitorEntries.reduce((s, e) => s + e.share, 0);
  // Adapter flag wins over numerical inspection so we can distinguish
  // "real zero" from "missing in snapshot". Default true keeps the
  // legacy mock entry behaviour intact when the flag is absent.
  const competitorHasStats = competitor.hasFormatStats !== false;
  if (primaryTotal <= 0 && (competitorTotal <= 0 || !competitorHasStats)) {
    return null;
  }

  const insight = competitorHasStats
    ? buildDonutInsight(primaryEntries, competitorEntries, competitor.windowAligned)
    : null;

  const primaryPostsAnalyzed = formats.reduce(
    (s, f) => s + (typeof f.count === "number" && Number.isFinite(f.count) ? f.count : 0),
    0,
  );
  const competitorPostsAnalyzed =
    typeof competitor.postsAnalyzed === "number" ? competitor.postsAnalyzed : 0;

  const sampleN = competitorHasStats
    ? primaryPostsAnalyzed > 0 && competitorPostsAnalyzed > 0
      ? Math.min(primaryPostsAnalyzed, competitorPostsAnalyzed)
      : Math.max(primaryPostsAnalyzed, competitorPostsAnalyzed)
    : primaryPostsAnalyzed;

  return (
    <CompareCardShell
      title="Mix de formatos"
      subtitle="Distribuição de Reels, Carrosséis e Imagens"
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
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <DonutSide
          side="primary"
          handle={primaryHandle}
          displayName={primaryFullName ?? null}
          avatarUrl={primaryAvatarUrl ?? null}
          verified={Boolean(primaryVerified)}
          entries={primaryEntries}
          postsAnalyzed={primaryPostsAnalyzed}
          competitorHasStats={true}
        />
        {competitorHasStats ? (
          <DonutSide
            side="competitor"
            handle={competitor.username}
            displayName={competitor.displayName}
            avatarUrl={competitor.avatarUrl ?? null}
            verified={Boolean(competitor.isVerified)}
            entries={competitorEntries}
            postsAnalyzed={competitorPostsAnalyzed}
            competitorHasStats={true}
          />
        ) : (
          <MissingSide
            handle={competitor.username}
            displayName={competitor.displayName}
            avatarUrl={competitor.avatarUrl ?? null}
            verified={Boolean(competitor.isVerified)}
          />
        )}
      </div>
      <CompareMissingDataNote
        className="mt-4"
        sampleN={sampleN > 0 ? sampleN : null}
        competitorMissing={!competitorHasStats}
      />
    </CompareCardShell>
  );
}

function MissingSide({
  handle,
  displayName,
  avatarUrl,
  verified,
}: {
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  verified: boolean;
}) {
  return (
    <PanelFrame side="competitor">
      <PanelHeader
        side="competitor"
        handle={handle}
        displayName={displayName}
        avatarUrl={avatarUrl}
        verified={verified}
      />
      <div
        role="note"
        aria-label={`Mix de formatos de @${handle} indisponível`}
        className="mt-6 flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-default/70 bg-surface-muted/40 px-4 py-10 text-center"
      >
        <p className="text-sm font-medium text-content-secondary leading-relaxed">
          Sem dados de formatos disponíveis para o concorrente nesta amostra.
        </p>
      </div>
    </PanelFrame>
  );
}

interface Entry {
  key: CanonicalFormatKey;
  label: string;
  share: number;
}

type Side = "primary" | "competitor";

const SIDE_COLORS: Record<Side, Record<CanonicalFormatKey, string>> = {
  primary: {
    Reels: "var(--accent-primary)",
    Carousels: "color-mix(in oklab, var(--accent-primary) 65%, white)",
    Imagens: "color-mix(in oklab, var(--accent-primary) 35%, white)",
  },
  competitor: {
    Reels: "var(--accent-secondary)",
    Carousels: "color-mix(in oklab, var(--accent-secondary) 65%, white)",
    Imagens: "color-mix(in oklab, var(--accent-secondary) 35%, white)",
  },
};

function DonutSide({
  side,
  handle,
  displayName,
  avatarUrl,
  verified,
  entries,
  postsAnalyzed,
}: {
  side: Side;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  verified: boolean;
  entries: Entry[];
  postsAnalyzed: number;
}) {
  const total = entries.reduce((s, e) => s + e.share, 0);
  const dominant = pickDominant(entries);
  const ariaParts = entries
    .filter((e) => e.share > 0)
    .map((e) => `${e.label} ${fmtPct(e.share)}`)
    .join(", ");
  return (
    <PanelFrame side={side}>
      <PanelHeader
        side={side}
        handle={handle}
        displayName={displayName}
        avatarUrl={avatarUrl}
        verified={verified}
      />
      <div className="mt-5 flex flex-col items-center gap-4">
        <div
          role="img"
          aria-label={`Mix de formatos de @${handle}: ${ariaParts || "sem dados"}.`}
          className="relative"
        >
          <Donut entries={entries} side={side} />
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {dominant ? (
              <>
                <span className="text-xs sm:text-sm text-content-secondary">
                  {dominant.label}
                </span>
                <span
                  className="font-semibold text-2xl sm:text-3xl tabular-nums tracking-tight"
                  style={{ color: SIDE_COLORS[side][dominant.key] }}
                >
                  {fmtPct(dominant.share)}
                </span>
              </>
            ) : (
              <span className="text-sm text-content-tertiary">Sem dados</span>
            )}
          </div>
        </div>
        {postsAnalyzed > 0 ? (
          <span className="inline-flex items-center rounded-full border border-border-subtle bg-surface-muted/60 px-2.5 py-1 text-xs text-content-tertiary tabular-nums">
            {postsAnalyzed} {postsAnalyzed === 1 ? "publicação" : "publicações"} na amostra
          </span>
        ) : null}
      </div>
      <ul className="mt-5 w-full space-y-2 border-t border-border-default/60 pt-4">
        {entries.map((e) => {
          const zero = e.share <= 0 || total <= 0;
          return (
            <li
              key={e.key}
              className={cn(
                "flex items-center justify-between text-sm",
                zero ? "text-content-tertiary" : "text-content-secondary",
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "inline-block size-3 rounded-full",
                    zero ? "ring-1 ring-border-default" : "",
                  )}
                  style={{ background: zero ? "transparent" : SIDE_COLORS[side][e.key] }}
                />
                {e.label}
              </span>
              <span className="font-semibold tabular-nums">
                {zero ? "—" : fmtPct(e.share)}
              </span>
            </li>
          );
        })}
      </ul>
    </PanelFrame>
  );
}

function PanelFrame({
  side,
  children,
}: {
  side: Side;
  children: React.ReactNode;
}) {
  const topBar = side === "primary" ? "bg-accent-primary" : "bg-compare-competitor";
  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-border-default/70 bg-white p-5 sm:p-6",
        "shadow-[0_1px_2px_-1px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]",
      )}
    >
      <span aria-hidden="true" className={cn("absolute inset-x-0 top-0 h-[3px]", topBar)} />
      {children}
    </div>
  );
}

function PanelHeader({
  side,
  handle,
  displayName,
  avatarUrl,
  verified,
}: {
  side: Side;
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  verified: boolean;
}) {
  const eyebrow = side === "primary" ? "Perfil" : "Concorrente";
  const eyebrowColor =
    side === "primary" ? "text-accent-primary" : "text-compare-competitor";
  return (
    <div className="flex flex-col gap-2 min-w-0">
      <span className={cn("text-eyebrow-sm", eyebrowColor)}>{eyebrow}</span>
      <div className="flex items-center gap-3 min-w-0">
        <CompareAvatar
          avatarUrl={avatarUrl}
          name={displayName || handle}
          verified={verified}
          side={side}
          sizeClass="size-10"
          showRing
        />
        <div className="min-w-0">
          <p className="font-sans text-base font-semibold text-content-primary truncate">
            @{handle}
          </p>
          {displayName ? (
            <p className="text-xs text-content-secondary truncate">{displayName}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Donut({ entries, side }: { entries: Entry[]; side: Side }) {
  const SIZE = 200;
  const R = 86;
  const C = 2 * Math.PI * R;
  const total = entries.reduce((s, e) => s + e.share, 0);
  const slices = entries.filter((e) => e.share > 0);
  const gapDeg = slices.length > 1 ? 2 : 0;
  const gapLen = (gapDeg / 360) * C;

  let offsetDeg = 0;
  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="block size-44 sm:size-48 md:size-52"
    >
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={R}
        fill="none"
        stroke="var(--border-default)"
        strokeOpacity={0.35}
        strokeWidth={28}
      />
      {total > 0 &&
        slices.map((e) => {
          const frac = e.share / total;
          const len = Math.max(frac * C - gapLen, 0.5);
          const dasharray = `${len} ${C - len}`;
          // start at -90deg, rotate by current offset
          const rotate = -90 + (offsetDeg / 360) * 360 + gapDeg / 2;
          offsetDeg += frac * 360;
          return (
            <circle
              key={e.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              fill="none"
              stroke={SIDE_COLORS[side][e.key]}
              strokeWidth={28}
              strokeLinecap="butt"
              strokeDasharray={dasharray}
              transform={`rotate(${rotate} ${SIZE / 2} ${SIZE / 2})`}
            />
          );
        })}
    </svg>
  );
}

function pickDominant(entries: Entry[]): Entry | null {
  const sorted = [...entries].filter((e) => e.share > 0).sort((a, b) => b.share - a.share);
  if (sorted.length === 0) return null;
  const top = sorted[0];
  const second = sorted[1];
  if (second && Math.abs(top.share - second.share) <= 1) {
    return { key: top.key, label: "Misto", share: top.share + second.share };
  }
  return top;
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
 * Deterministic insight comparing concentration (HHI) on both sides.
 * Returns null when the sample is too small or no pattern is clear.
 */
function buildDonutInsight(
  primary: Entry[],
  competitor: Entry[],
  windowAligned: boolean | undefined,
): string | null {
  const pTotal = primary.reduce((s, e) => s + e.share, 0);
  const cTotal = competitor.reduce((s, e) => s + e.share, 0);
  if (windowAligned === false) return null;
  if (pTotal < 90 || cTotal < 90) {
    return "Amostra demasiado pequena para uma leitura estável do mix de formatos.";
  }

  const hhi = (xs: Entry[]) => xs.reduce((s, e) => s + (e.share / 100) ** 2, 0);
  const pHhi = hhi(primary);
  const cHhi = hhi(competitor);
  const pDom = pickDominant(primary);
  const cDom = pickDominant(competitor);
  if (!pDom || !cDom) return null;

  const pConcentrated = pHhi >= 0.55;
  const cConcentrated = cHhi >= 0.55;
  const pDiversified = pHhi <= 0.4;
  const cDiversified = cHhi <= 0.4;

  if (pConcentrated && cConcentrated && pDom.key !== cDom.key && pDom.label !== "Misto" && cDom.label !== "Misto") {
    return `Ambos concentram-se num formato distinto: tu em ${pDom.label}, o concorrente em ${cDom.label}.`;
  }
  if (pConcentrated && cDiversified && pDom.label !== "Misto") {
    return `Estás concentrado em ${pDom.label} (${fmtPct(pDom.share)}); o concorrente distribui-se mais entre formatos.`;
  }
  if (cConcentrated && pDiversified && cDom.label !== "Misto") {
    return `O concorrente aposta sobretudo em ${cDom.label} (${fmtPct(cDom.share)}); a tua presença é mais equilibrada.`;
  }
  if (pDiversified && cDiversified) {
    return "Ambos mantêm um mix equilibrado entre Reels, Carrosséis e Imagens.";
  }

  // Same-dominant gap fallback
  if (pDom.key === cDom.key) {
    const pShare = primary.find((e) => e.key === pDom.key)?.share ?? 0;
    const cShare = competitor.find((e) => e.key === pDom.key)?.share ?? 0;
    const gap = pShare - cShare;
    if (gap >= 10) {
      return `Este perfil investe mais em ${pDom.label} (${fmtPct(pShare)} vs ${fmtPct(cShare)}).`;
    }
    if (-gap >= 10) {
      return `O concorrente investe muito mais em ${pDom.label} — ${fmtPct(cShare)} contra os teus ${fmtPct(pShare)}.`;
    }
  }

  return null;
}