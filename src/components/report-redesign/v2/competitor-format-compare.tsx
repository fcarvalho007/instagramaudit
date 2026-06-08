import { CompareCardShell } from "@/components/report-redesign/v2/compare";
import type { FormatEntry } from "@/components/report-redesign/v2/overview/format-card";
import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";
import { normaliseFormatKey, type CanonicalFormatKey } from "@/lib/report/format-keys";

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
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
        <DonutSide
          handle={primaryHandle}
          entries={primaryEntries}
          side="primary"
        />
        {competitorHasStats ? (
          <DonutSide
            handle={competitor.username}
            entries={competitorEntries}
            side="competitor"
          />
        ) : (
          <MissingSide handle={competitor.username} />
        )}
      </div>
    </CompareCardShell>
  );
}

function MissingSide({ handle }: { handle: string }) {
  return (
    <div
      className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-default/70 bg-surface-muted/40 p-6 text-center"
      role="note"
      aria-label={`Mix de formatos de @${handle} indisponível`}
    >
      <span className="text-eyebrow-sm text-content-tertiary">@{handle}</span>
      <p className="text-sm font-medium text-content-secondary">
        Dados do concorrente indisponíveis nesta amostra.
      </p>
      <p className="text-xs text-content-tertiary">
        Mix de formatos requer publicações analisadas no concorrente.
      </p>
    </div>
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

function DonutSide({ handle, entries, side }: { handle: string; entries: Entry[]; side: Side }) {
  const total = entries.reduce((s, e) => s + e.share, 0);
  const dominant = pickDominant(entries);
  const ariaParts = entries
    .filter((e) => e.share > 0)
    .map((e) => `${e.label} ${fmtPct(e.share)}`)
    .join(", ");
  return (
    <div className="flex flex-col items-center gap-4">
      <div
        role="img"
        aria-label={`Mix de formatos de @${handle}: ${ariaParts || "sem dados"}.`}
        className="relative"
      >
        <Donut entries={entries} side={side} />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {dominant ? (
            <>
              <span className="text-sm text-content-secondary">{dominant.label}</span>
              <span
                className="font-semibold text-xl tabular-nums"
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
      <div className="text-eyebrow-sm text-content-tertiary">@{handle}</div>
      <ul className="w-full max-w-[200px] space-y-1.5">
        {entries.map((e) => {
          const zero = e.share <= 0 || total <= 0;
          return (
            <li
              key={e.key}
              className={`flex items-center justify-between text-sm ${zero ? "text-content-tertiary" : "text-content-secondary"}`}
            >
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block size-2.5 rounded-full"
                  style={{ background: SIDE_COLORS[side][e.key] }}
                />
                {e.label}
              </span>
              <span className="font-semibold tabular-nums">{fmtPct(e.share)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Donut({ entries, side }: { entries: Entry[]; side: Side }) {
  const SIZE = 160;
  const R = 70;
  const C = 2 * Math.PI * R;
  const total = entries.reduce((s, e) => s + e.share, 0);
  const slices = entries.filter((e) => e.share > 0);
  const gapDeg = slices.length > 1 ? 2 : 0;
  const gapLen = (gapDeg / 360) * C;

  let offsetDeg = 0;
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="block size-40 sm:size-44">
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={R}
        fill="none"
        stroke="var(--border-default)"
        strokeOpacity={0.35}
        strokeWidth={22}
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
              strokeWidth={22}
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
  if (pTotal < 90 || cTotal < 90) return null;

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