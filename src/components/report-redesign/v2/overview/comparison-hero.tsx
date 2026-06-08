import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";
import { formatCompactNumber } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { CompareAvatar } from "@/components/report-redesign/v2/compare/compare-handle-row";

interface PrimarySide {
  handle: string;
  fullName: string | null;
  avatarUrl: string | null;
  verified: boolean;
  followers: number;
  engagementRate: number;
  engagementBenchmark: number;
  postingFrequencyWeekly: number;
  dominantFormat: string;
  postsAnalyzed?: number;
}

interface Props {
  primary: PrimarySide;
  competitor: ReportCompetitorBreakdownEntry;
  windowLabel?: string | null;
}

type Side = "primary" | "competitor" | null;

interface MetricRow {
  label: string;
  primary: string;
  competitor: string;
  winner: Side;
}

/**
 * Pro-only Comparison Hero — opens the report in side-by-side duel mode
 * whenever a first competitor exists. Presentation-only, deterministic.
 */
export function ComparisonHero({ primary, competitor, windowLabel }: Props) {
  const rows = buildRows(primary, competitor);
  const verdict = buildHeroVerdict(primary, competitor);
  const sampleN = methodologySampleSize(primary, competitor);

  return (
    <section
      aria-label={`Comparação ${primary.handle} vs ${competitor.username}`}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border-default bg-white",
        "p-6 sm:p-8 md:p-12",
        "shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06),0_8px_32px_-12px_rgba(15,23,42,0.12)]",
      )}
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-eyebrow-sm text-content-tertiary">
          Comparação Pro
        </span>
        {windowLabel ? (
          <span className="text-xs text-content-tertiary">
            · {windowLabel}
          </span>
        ) : null}
        {!competitor.windowAligned ? (
          <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-border-subtle bg-surface-muted px-2.5 py-1 text-xs text-content-tertiary">
            Concorrente em janela baseline
          </span>
        ) : null}
      </header>

      {/* Duel identity cards */}
      <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-5 md:gap-8 items-stretch">
        <IdentityCard
          side="primary"
          handle={primary.handle}
          displayName={primary.fullName}
          avatarUrl={primary.avatarUrl}
          verified={primary.verified}
          rows={rows.map((r) => ({ label: r.label, value: r.primary, highlighted: r.winner === "primary" }))}
        />
        <VsDivider />
        <IdentityCard
          side="competitor"
          handle={competitor.username}
          displayName={competitor.displayName}
          avatarUrl={competitor.avatarUrl ?? null}
          verified={Boolean(competitor.isVerified)}
          rows={rows.map((r) => ({ label: r.label, value: r.competitor, highlighted: r.winner === "competitor" }))}
        />
      </div>

      {/* Editorial verdict */}
      <p className="mt-8 md:mt-10 font-serif text-lg sm:text-xl text-content-primary leading-snug">
        <span aria-hidden="true" className="text-accent-primary mr-2">▸</span>
        {verdict}
      </p>

      {/* Methodology footnote */}
      <p className="mt-3 text-xs text-content-tertiary">
        {sampleN > 0
          ? `Comparação com base nas últimas ${sampleN} publicações disponíveis.`
          : "Comparação com base nas publicações disponíveis."}
        {competitor.windowAligned === false
          ? " Concorrente em janela baseline."
          : ""}
      </p>
    </section>
  );
}

// ─── Identity card ─────────────────────────────────────────────────

function IdentityCard({
  side,
  handle,
  displayName,
  avatarUrl,
  verified,
  rows,
}: {
  side: "primary" | "competitor";
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  verified: boolean;
  rows: { label: string; value: string; highlighted: boolean }[];
}) {
  const eyebrowText = side === "primary" ? "Perfil" : "Concorrente";
  const eyebrowColor =
    side === "primary" ? "text-accent-primary" : "text-compare-competitor";
  const highlightColor =
    side === "primary" ? "text-accent-primary" : "text-compare-competitor";
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border-default/70 bg-white p-5 sm:p-6",
      )}
    >
      <span className={cn("text-eyebrow-sm", eyebrowColor)}>{eyebrowText}</span>
      <div className="mt-3 flex items-center gap-3 min-w-0">
        <CompareAvatar
          avatarUrl={avatarUrl}
          name={displayName || handle}
          verified={verified}
          side={side}
          sizeClass="size-12 sm:size-14"
          showRing
        />
        <div className="min-w-0">
          <p className="font-sans text-base sm:text-lg font-semibold text-content-primary truncate">
            @{handle}
          </p>
          {displayName ? (
            <p className="text-sm text-content-secondary truncate">
              {displayName}
            </p>
          ) : null}
        </div>
      </div>
      {rows.length > 0 ? (
        <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-border-default/60 pt-4">
          {rows.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-3">
              <dt className="text-eyebrow-sm text-content-tertiary">{r.label}</dt>
              <dd
                className={cn(
                  "font-sans tabular-nums tracking-tight text-base sm:text-lg",
                  r.highlighted ? cn("font-semibold", highlightColor) : "font-medium text-content-primary",
                )}
              >
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

function VsDivider() {
  return (
    <div className="relative flex items-center justify-center md:px-2">
      <span
        aria-hidden="true"
        className="hidden md:block absolute inset-y-0 left-1/2 w-px bg-border-default/60"
      />
      <span className="relative font-serif text-3xl sm:text-4xl text-content-tertiary bg-white px-3 tracking-tight">
        vs
      </span>
    </div>
  );
}

// ─── Row builder ───────────────────────────────────────────────────

function buildRows(p: PrimarySide, c: ReportCompetitorBreakdownEntry): MetricRow[] {
  const rows: MetricRow[] = [];

  if (isPos(p.followers) && isPos(c.followers)) {
    rows.push({
      label: "Seguidores",
      primary: fmtCompact(p.followers),
      competitor: fmtCompact(c.followers),
      winner: pickWinner(p.followers, c.followers),
    });
  }

  const pSample = isPos(p.postsAnalyzed) ? p.postsAnalyzed : null;
  const cSample = isPos(c.postsAnalyzed) ? c.postsAnalyzed : null;
  if (pSample !== null && cSample !== null) {
    rows.push({
      label: "Publicações na amostra",
      primary: fmtInt(pSample),
      competitor: fmtInt(cSample),
      winner: null,
    });
  }

  if (isPos(p.engagementRate) && isPos(c.averageEngagementRate)) {
    rows.push({
      label: "Envolvimento médio",
      primary: fmtPct(p.engagementRate),
      competitor: fmtPct(c.averageEngagementRate),
      winner: pickWinner(p.engagementRate, c.averageEngagementRate),
    });
  }

  if (isPos(p.postingFrequencyWeekly) && isPos(c.estimatedPostsPerWeek)) {
    rows.push({
      label: "Publicações por semana",
      primary: fmtDec(p.postingFrequencyWeekly, 1),
      competitor: fmtDec(c.estimatedPostsPerWeek, 1),
      winner: pickWinner(p.postingFrequencyWeekly, c.estimatedPostsPerWeek),
    });
  }

  return rows;
}

// ─── Deterministic editorial verdict ──────────────────────────────

function buildHeroVerdict(p: PrimarySide, c: ReportCompetitorBreakdownEntry): string {
  const pFollowers = isPos(p.followers) ? p.followers : 0;
  const cFollowers = isPos(c.followers) ? c.followers : 0;
  const pEr = isPos(p.engagementRate) ? p.engagementRate : 0;
  const cEr = isPos(c.averageEngagementRate) ? c.averageEngagementRate : 0;
  const pPpw = isPos(p.postingFrequencyWeekly) ? p.postingFrequencyWeekly : 0;
  const cPpw = isPos(c.estimatedPostsPerWeek) ? c.estimatedPostsPerWeek : 0;

  if (cFollowers > pFollowers * 1.5 && pEr > cEr) {
    return "O concorrente tem mais escala, mas este perfil gera uma resposta proporcionalmente superior por publicação.";
  }
  if (pFollowers > cFollowers * 1.5 && cEr > pEr) {
    return "Este perfil tem mais escala, mas o concorrente gera uma resposta proporcionalmente superior.";
  }
  if (cEr > pEr * 1.1) {
    return "O concorrente regista um envolvimento médio superior por publicação.";
  }
  if (pEr > cEr * 1.1) {
    return "Este perfil regista um envolvimento médio superior por publicação.";
  }
  if (cPpw > pPpw * 1.25) {
    return "O concorrente publica com maior frequência semanal.";
  }
  if (pPpw > cPpw * 1.25) {
    return "Este perfil publica com maior frequência semanal.";
  }
  return "Os dois perfis apresentam dimensão e envolvimento comparáveis.";
}

function methodologySampleSize(
  p: PrimarySide,
  c: ReportCompetitorBreakdownEntry,
): number {
  const a = isPos(p.postsAnalyzed) ? p.postsAnalyzed : 0;
  const b = isPos(c.postsAnalyzed) ? c.postsAnalyzed : 0;
  if (a > 0 && b > 0) return Math.min(a, b);
  return Math.max(a, b);
}

function pickWinner(a: number, b: number): Side {
  if (a === b) return null;
  return a > b ? "primary" : "competitor";
}

function isPos(n: number | null | undefined): n is number {
  return typeof n === "number" && Number.isFinite(n) && n > 0;
}

function fmtCompact(n: number): string {
  return formatCompactNumber(n, "pt");
}

function fmtInt(n: number): string {
  return n.toLocaleString("pt-PT");
}

function fmtDec(n: number, d: number): string {
  return n.toLocaleString("pt-PT", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function fmtPct(n: number): string {
  return `${n.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`;
}