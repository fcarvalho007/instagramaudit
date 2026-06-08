import { useState } from "react";
import { Check } from "lucide-react";

import type { ReportCompetitorBreakdownEntry } from "@/components/report/report-mock-data";
import { formatCompactNumber } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { computeEnvolvimento } from "./score-utils";

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
 * whenever a first competitor exists. Presentation-only.
 */
export function ComparisonHero({ primary, competitor, windowLabel }: Props) {
  const rows = buildRows(primary, competitor);

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
          <span className="inline-flex items-center rounded-full border border-border-default px-2.5 py-0.5 text-[11px] font-medium text-content-secondary">
            Concorrente em janela baseline
          </span>
        ) : null}
      </header>

      {/* Duel identity row */}
      <div className="mt-6 md:mt-8 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-6 md:gap-8">
        <IdentityBlock
          side="primary"
          handle={primary.handle}
          fullName={primary.fullName}
          avatarUrl={primary.avatarUrl}
          verified={primary.verified}
        />
        <VsDivider />
        <IdentityBlock
          side="competitor"
          handle={competitor.username}
          fullName={competitor.displayName}
          avatarUrl={competitor.avatarUrl}
          verified={competitor.isVerified}
        />
      </div>

      {/* Metric rows */}
      {rows.length > 0 ? (
        <div className="mt-8 md:mt-12 divide-y divide-border-default/60 border-t border-border-default/60">
          {rows.map((row) => (
            <MetricRowView key={row.label} row={row} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

// ─── Identity block ────────────────────────────────────────────────

function IdentityBlock({
  side,
  handle,
  fullName,
  avatarUrl,
  verified,
}: {
  side: "primary" | "competitor";
  handle: string;
  fullName: string | null;
  avatarUrl: string | null;
  verified: boolean;
}) {
  const ringColor =
    side === "primary" ? "ring-[#3772E5]" : "ring-[#7664E4]";
  const accentText =
    side === "primary" ? "text-[#3772E5]" : "text-[#7664E4]";
  const eyebrowLabel = side === "primary" ? "Perfil" : "Concorrente";

  return (
    <div className="flex flex-col items-center md:items-start gap-3 min-w-0">
      <span className={cn("text-eyebrow-sm", accentText)}>{eyebrowLabel}</span>
      <div className="flex items-center gap-4 min-w-0">
        <Avatar
          avatarUrl={avatarUrl}
          name={fullName || handle}
          verified={verified}
          ringClass={ringColor}
        />
        <div className="min-w-0">
          <p className="font-sans text-base sm:text-lg font-semibold text-content-primary truncate">
            @{handle}
          </p>
          {fullName ? (
            <p className="font-display text-lg sm:text-xl text-content-secondary tracking-tight truncate">
              {fullName}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Avatar({
  avatarUrl,
  name,
  verified,
  ringClass,
}: {
  avatarUrl: string | null;
  name: string;
  verified: boolean;
  ringClass: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .replace(/^@/, "")
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const show = Boolean(avatarUrl) && !failed;
  return (
    <div className="relative shrink-0">
      {show ? (
        <img
          src={avatarUrl as string}
          alt={name}
          loading="eager"
          decoding="async"
          onError={() => setFailed(true)}
          className={cn(
            "size-16 sm:size-20 rounded-full object-cover bg-surface-muted ring-2 ring-offset-2 ring-offset-white",
            ringClass,
          )}
        />
      ) : (
        <div
          aria-hidden="true"
          className={cn(
            "size-16 sm:size-20 rounded-full flex items-center justify-center bg-surface-muted",
            "font-display text-xl font-semibold text-content-tertiary",
            "ring-2 ring-offset-2 ring-offset-white",
            ringClass,
          )}
        >
          {initials}
        </div>
      )}
      {verified ? (
        <span
          aria-label="Verificado"
          title="Verificado"
          className="absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-signal-success text-white ring-2 ring-white size-5"
        >
          <Check className="size-3" strokeWidth={3.5} aria-hidden="true" />
        </span>
      ) : null}
    </div>
  );
}

function VsDivider() {
  return (
    <div className="relative flex items-center justify-center md:px-4">
      <span
        aria-hidden="true"
        className="hidden md:block absolute inset-x-0 top-1/2 h-px bg-border-default/60"
      />
      <span className="relative font-display text-3xl sm:text-4xl md:text-5xl font-medium text-content-tertiary bg-white px-3 md:px-4 tracking-tight">
        vs
      </span>
    </div>
  );
}

// ─── Metric rows ───────────────────────────────────────────────────

function MetricRowView({ row }: { row: MetricRow }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_auto_1fr] items-baseline gap-2 md:gap-6 py-3 md:py-4">
      <span className="text-eyebrow-sm text-content-tertiary md:normal-case md:tracking-normal md:text-sm md:text-content-secondary md:font-normal">
        {row.label}
      </span>
      <ValueCell
        value={row.primary}
        highlighted={row.winner === "primary"}
        side="primary"
        align="md:text-right"
      />
      <span aria-hidden="true" className="hidden md:inline text-content-tertiary/60">·</span>
      <ValueCell
        value={row.competitor}
        highlighted={row.winner === "competitor"}
        side="competitor"
        align="md:text-left"
      />
    </div>
  );
}

function ValueCell({
  value,
  highlighted,
  side,
  align,
}: {
  value: string;
  highlighted: boolean;
  side: "primary" | "competitor";
  align: string;
}) {
  const color = highlighted
    ? side === "primary"
      ? "text-[#3772E5]"
      : "text-[#7664E4]"
    : "text-content-primary";
  return (
    <span
      className={cn(
        "font-sans text-base sm:text-lg md:text-xl tabular-nums tracking-tight",
        highlighted ? "font-semibold" : "font-medium",
        color,
        align,
      )}
    >
      {value}
    </span>
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

  const pFmt = (p.dominantFormat ?? "").trim();
  const cFmt = (c.dominantFormat ?? "").trim();
  if (pFmt && pFmt !== "—" && cFmt && cFmt !== "—") {
    rows.push({
      label: "Formato dominante",
      primary: pFmt,
      competitor: cFmt,
      winner: null,
    });
  }

  const pScore = computeEnvolvimento(p.engagementRate, p.engagementBenchmark);
  const cScore = computeEnvolvimento(
    c.averageEngagementRate,
    p.engagementBenchmark,
  );
  if (isPos(pScore) && isPos(cScore)) {
    rows.push({
      label: "Score editorial",
      primary: String(pScore),
      competitor: String(cScore),
      winner: pickWinner(pScore, cScore),
    });
  }

  return rows;
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