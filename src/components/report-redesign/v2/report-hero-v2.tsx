import { useState } from "react";
import { Check, Download, Plus, Users, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

import type {
  AdapterResult,
  ReportEnriched,
} from "@/lib/report/snapshot-to-report-data";
import type { ReportPageActions } from "@/components/report/report-page";
import { ShareReportPopover } from "@/components/report-share/share-popover";
import { CompetitorModal } from "./overview/competitor-modal";
import { cn } from "@/lib/utils";

interface ReportHeroV2Props {
  result: AdapterResult;
  actions: ReportPageActions;
  analyzedAtIso?: string | null;
  expiresAtIso?: string | null;
}

/**
 * Hero v2 — Prism editorial.
 *
 *   Left:  large avatar (verified badge overlay) · @handle · nome ·
 *          single metric line "X seguidores · Y publicações · Z posts em N dias"
 *   Right: action stack (Novo relatório / Comparar PRO / PDF + Partilhar)
 *          with subtle prism glass decoration behind it on desktop.
 */
export function ReportHeroV2({
  result,
  actions,
}: ReportHeroV2Props) {
  const profile = result.data.profile;
  const enriched: ReportEnriched = result.enriched;

  const handle = `@${profile.username}`;
  const fullName = profile.fullName?.trim() || "";
  const avatarUrl = enriched.profile.avatarUrl;
  const verified = Boolean(profile.verified);

  const followers = profile.followers ?? 0;
  const postsCount = profile.postsCount ?? 0;
  const postsAnalyzed = profile.postsAnalyzed ?? 0;
  const windowDays = result.coverage.windowDays ?? 0;

  const [compareOpen, setCompareOpen] = useState(false);

  return (
    <section
      aria-label="Cabeçalho do relatório"
      className="w-full px-5 md:px-6 pt-5 pb-4"
    >
      <div className="mx-auto max-w-[1520px]">
        {/* ── HERO CARD ──────────────────────────────────────────── */}
        <div className="relative rounded-2xl border border-border-default bg-white shadow-card overflow-hidden">
          {/* Prism glass decoration — desktop only */}
          <PrismDecoration />

          <div className="relative px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10 flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-12">

            {/* ── Identity ─────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 flex items-center gap-5 lg:gap-7">
              <Avatar
                avatarUrl={avatarUrl}
                fullName={fullName || handle}
                verified={verified}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <h1 className="font-display text-[2rem] lg:text-[2.5rem] font-semibold tracking-[-0.025em] text-content-primary leading-[1.05] break-words">
                  {handle}
                </h1>
                {fullName && (
                  <p className="text-sm font-medium text-content-secondary leading-snug">
                    {fullName}
                  </p>
                )}
                <MetricLine
                  followers={followers}
                  postsCount={postsCount}
                  postsAnalyzed={postsAnalyzed}
                  windowDays={windowDays}
                />
              </div>
            </div>

            {/* ── Actions stack ────────────────────────────────────── */}
            <div className="relative w-full lg:w-[320px] shrink-0 flex flex-col gap-2.5">
              <Link
                to="/"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl h-12 px-5",
                  "bg-gradient-to-b from-content-primary to-[#0a0f1d] text-white text-[15px] font-semibold",
                  "shadow-[0_1px_2px_rgba(15,23,42,0.18)]",
                  "transition-all duration-150",
                  "hover:brightness-110 hover:-translate-y-[1px] hover:shadow-md",
                )}
              >
                <Plus className="size-4" aria-hidden="true" />
                Novo relatório
              </Link>

              <button
                type="button"
                onClick={() => setCompareOpen(true)}
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-xl h-12 px-4 whitespace-nowrap",
                  "border border-border-default bg-white text-content-primary text-[15px] font-semibold",
                  "transition-colors duration-150",
                  "hover:border-accent-primary/40 hover:text-accent-primary hover:bg-accent-primary/[0.04]",
                )}
              >
                <Users className="size-4" aria-hidden="true" />
                Comparar concorrente
                <span className="inline-flex items-center rounded-full bg-accent-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Pro
                </span>
              </button>

              <div className="mt-1 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={actions.onExportPdf}
                  disabled={actions.pdfDisabled || actions.pdfBusy}
                  aria-busy={actions.pdfBusy}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-xl h-11 px-3",
                    "border border-border-default bg-white text-content-secondary text-sm font-semibold",
                    "transition-colors duration-150",
                    "hover:bg-surface-muted hover:border-border-strong hover:text-content-primary",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  {actions.pdfBusy ? (
                    <Loader2 className="size-[15px] animate-spin" aria-hidden="true" />
                  ) : (
                    <Download className="size-[15px]" aria-hidden="true" />
                  )}
                  PDF
                </button>
                <ShareReportPopover
                  result={result}
                  variant="ghost"
                  triggerLabel="Partilhar"
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-xl h-11 px-3",
                    "border border-border-default bg-white text-content-secondary text-sm font-semibold",
                    "transition-colors duration-150",
                    "hover:bg-surface-muted hover:border-border-strong hover:text-content-primary",
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <CompetitorModal open={compareOpen} onOpenChange={setCompareOpen} />
    </section>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatCompact(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return trimZero((n / 1_000_000).toFixed(1)) + "M";
  if (abs >= 10_000) return trimZero((n / 1_000).toFixed(0)) + "K";
  if (abs >= 1_000) return trimZero((n / 1_000).toFixed(1)) + "K";
  return new Intl.NumberFormat("pt-PT").format(n);
}

function trimZero(s: string): string {
  return s.replace(/\.0$/, "");
}

// ─── Sub-components ──────────────────────────────────────────────────

function MetricLine({
  followers,
  postsCount,
  postsAnalyzed,
  windowDays,
}: {
  followers: number;
  postsCount: number;
  postsAnalyzed: number;
  windowDays: number;
}) {
  const parts: Array<{ value: string; label: string }> = [];
  if (followers > 0) parts.push({ value: formatCompact(followers), label: "seguidores" });
  if (postsCount > 0) parts.push({ value: formatCompact(postsCount), label: "publicações" });
  if (postsAnalyzed > 0) {
    parts.push({
      value: String(postsAnalyzed),
      label: windowDays > 0 ? `posts em ${windowDays} dias` : "posts analisados",
    });
  }

  if (parts.length === 0) return null;

  return (
    <p className="text-[15px] text-content-secondary leading-relaxed mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      {parts.map((p, i) => (
        <span key={p.label} className="inline-flex items-baseline gap-1.5">
          {i > 0 && (
            <span className="text-content-tertiary/60 select-none" aria-hidden="true">·</span>
          )}
          <span className="font-semibold text-content-primary tabular-nums">{p.value}</span>
          <span>{p.label}</span>
        </span>
      ))}
    </p>
  );
}

function PrismDecoration() {
  return (
    <div
      aria-hidden="true"
      className="hidden lg:block pointer-events-none absolute inset-y-0 right-0 w-[460px] overflow-hidden"
    >
      <div className="absolute top-6 right-10 size-48 rounded-full bg-accent-luminous/15 blur-3xl" />
      <div className="absolute bottom-2 right-32 size-40 rotate-12 rounded-3xl bg-gradient-to-br from-accent-primary/20 via-accent-violet/15 to-transparent blur-2xl" />
      <div className="absolute top-10 right-24 size-28 rotate-[-12deg] rounded-2xl border border-white/70 bg-white/40 backdrop-blur-xl shadow-[0_8px_24px_-12px_rgba(37,99,217,0.25)]" />
      <div className="absolute bottom-8 right-6 size-20 rotate-[18deg] rounded-xl border border-white/60 bg-white/30 backdrop-blur-md" />
    </div>
  );
}

function Avatar({
  avatarUrl,
  fullName,
  verified,
}: {
  avatarUrl: string | null;
  fullName: string;
  verified: boolean;
}) {
  const initials = fullName
    .replace(/^@/, "")
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const sizeClass = "size-20 md:size-28";

  const inner = avatarUrl ? (
    <img
      src={`/api/public/ig-thumb?url=${encodeURIComponent(avatarUrl)}`}
      alt={`Avatar de ${fullName}`}
      loading="eager"
      decoding="async"
      className={cn("rounded-full object-cover bg-surface-muted", sizeClass)}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  ) : (
    <div
      className={cn(
        "rounded-full flex items-center justify-center",
        "font-display text-2xl md:text-3xl font-semibold text-content-tertiary",
        "bg-surface-muted",
        sizeClass,
      )}
      aria-hidden="true"
    >
      {initials}
    </div>
  );

  return (
    <div className="relative shrink-0 rounded-full border border-border-default/60 p-1 bg-white">
      {inner}
      {verified && (
        <span
          aria-label="Conta verificada"
          title="Conta verificada"
          className="absolute bottom-0.5 right-0.5 inline-flex items-center justify-center size-6 md:size-7 rounded-full bg-signal-success text-white ring-2 ring-white shadow-[0_1px_3px_rgba(15,23,42,0.18)]"
        >
          <Check className="size-3.5 md:size-4" strokeWidth={3.5} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

