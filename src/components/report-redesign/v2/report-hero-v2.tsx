import { Check, Download, Loader2, Plus, Share2, Calendar, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";

import type {
  AdapterResult,
  ReportEnriched,
} from "@/lib/report/snapshot-to-report-data";
import type { ReportPageActions } from "@/components/report/report-page";
import { ShareReportPopover } from "@/components/report-share/share-popover";
import { cn } from "@/lib/utils";

interface ReportHeroV2Props {
  result: AdapterResult;
  actions: ReportPageActions;
}

/**
 * Hero v2 — Mockup-aligned compact first fold.
 *
 *   Top bar: logo · breadcrumb · status pill · CTA
 *   Hero card: 3-column layout (profile | metrics | actions)
 *   Footer: comparison CTA + multi-network teaser + date
 */
export function ReportHeroV2({ result, actions }: ReportHeroV2Props) {
  const profile = result.data.profile;
  const enriched: ReportEnriched = result.enriched;
  const k = result.data.keyMetrics;

  const handle = `@${profile.username}`;
  const fullName = profile.fullName?.trim() || "";
  const bio = enriched.profile.bio;
  const avatarUrl = enriched.profile.avatarUrl;
  const verified = Boolean(profile.verified);

  const analysisMeta = buildAnalysisMeta({
    postsAnalyzed: profile.postsAnalyzed ?? 0,
    windowDays: result.coverage.windowDays ?? 0,
    analyzedAt: profile.analyzedAt ?? "",
  });

  const followers = profile.followers ?? 0;
  const postsCount = profile.postsCount ?? 0;
  const engRate = k.engagementRate;
  const engBenchmark = k.engagementBenchmark;
  const engDelta = k.engagementDeltaPct;

  // Mid-tier label from benchmark
  const midTierLabel = engBenchmark > 0
    ? `mid-tier: ${engBenchmark.toFixed(2).replace(".", ",")}%`
    : null;

  return (
    <section
      aria-label="Cabeçalho do relatório"
      className="w-full px-4 sm:px-6 lg:px-8 pt-4 pb-3"
    >
      <div className="mx-auto max-w-[1380px]">
        {/* ── TOP BAR ────────────────────────────────────────────── */}

        {/* ── HERO CARD ──────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border-default bg-white shadow-card overflow-hidden">
          {/* Main 3-col layout (md+) */}
          <div className="flex flex-col md:flex-row md:items-stretch md:divide-x md:divide-border-default">

            {/* ── COL 1: Profile identity ──────────────────────────── */}
            <div className="flex-1 min-w-0 px-5 py-5 sm:px-6 sm:py-5">
              <div className="flex items-start gap-4">
                <Avatar avatarUrl={avatarUrl} fullName={fullName || handle} />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-[-0.02em] text-content-primary leading-tight break-words">
                      {handle}
                    </h1>
                    {verified && <VerifiedBadge />}
                  </div>
                  {fullName && (
                    <p className="text-sm font-medium text-content-secondary leading-snug">
                      {fullName}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap mt-0.5">
                    <PlatformPill />
                    <StatusPill label="Ativo" />
                  </div>
                </div>
              </div>
              {bio && (
                <p className="text-[13px] text-content-tertiary leading-relaxed line-clamp-2 max-w-md mt-2.5">
                  {bio}
                </p>
              )}
              {/* Date + posts metadata */}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {analysisMeta.dateLabel && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-content-tertiary">
                    <Calendar className="size-3 text-content-tertiary" aria-hidden="true" />
                    {analysisMeta.dateLabel?.replace("Atualizado ", "")}
                  </span>
                )}
                {analysisMeta.postsLabel && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-signal-success">
                    {analysisMeta.postsLabel}
                  </span>
                )}
              </div>
            </div>

            {/* ── COL 2: KPI metrics ──────────────────────────────── */}
            <div className="border-t md:border-t-0 flex-1 min-w-0 py-5 flex items-center justify-center">
              <div className="flex flex-wrap items-center justify-center gap-y-4">
                {/* Seguidores */}
                <div className="flex flex-col items-center gap-1.5 px-4 lg:px-5">
                  <span className="tabular-nums text-2xl lg:text-[2rem] font-bold text-content-primary leading-none">
                    {formatCompact(followers)}
                  </span>
                  <span className="text-eyebrow-sm text-content-tertiary">
                    seguidores
                  </span>
                </div>

                <div className="hidden md:block w-px h-10 bg-border-default" aria-hidden="true" />

                {/* Taxa de Engagement */}
                <div className="flex flex-col items-center gap-1.5 px-4 lg:px-5">
                  <span className="text-eyebrow-sm text-accent-primary font-semibold">
                    Principal
                  </span>
                  <span className="tabular-nums text-2xl lg:text-[2rem] font-bold text-content-primary leading-none">
                    {engRate.toFixed(2).replace(".", ",")}%
                  </span>
                  <span className="text-eyebrow-sm text-content-tertiary text-center">
                    taxa de engagement
                  </span>
                  {midTierLabel && (
                    <span className="inline-flex items-center rounded-full bg-signal-success/10 px-2 py-0.5 text-[11px] font-medium text-signal-success mt-0.5">
                      {midTierLabel}
                    </span>
                  )}
                </div>

                <div className="hidden md:block w-px h-10 bg-border-default" aria-hidden="true" />

                {/* Delta benchmark */}
                <div className="flex flex-col items-center gap-1.5 px-4 lg:px-5">
                  <span
                    className={cn(
                      "tabular-nums text-2xl lg:text-[2rem] font-bold leading-none",
                      engDelta >= 0 ? "text-signal-success" : "text-signal-danger",
                    )}
                  >
                    {engDelta >= 0 ? "+" : ""}{Math.round(engDelta)}%
                  </span>
                  <span className="text-eyebrow-sm text-content-tertiary text-center">
                    {engDelta >= 0 ? "acima do" : "abaixo do"} benchmark
                  </span>
                </div>

                <div className="hidden md:block w-px h-10 bg-border-default" aria-hidden="true" />

                {/* Publicações */}
                <div className="flex flex-col items-center gap-1.5 px-4 lg:px-5">
                  <span className="tabular-nums text-2xl lg:text-[2rem] font-bold text-content-primary leading-none">
                    {formatCompact(postsCount)}
                  </span>
                  <span className="text-eyebrow-sm text-content-tertiary">
                    publicações
                  </span>
                </div>
              </div>
            </div>

            {/* ── COL 3: Report actions ────────────────────────────── */}
            <div className="hidden md:flex flex-col items-center justify-center gap-2 px-5 py-5 shrink-0 w-[180px]">
              <span className="text-eyebrow-sm text-content-tertiary mb-1">
                Relatório
              </span>
              <Link
                to="/"
                className={cn(
                  "w-full inline-flex items-center justify-center gap-2 rounded-lg h-9 px-4",
                  "bg-white border border-border-default text-content-secondary text-[13px] font-medium",
                  "transition-colors duration-150",
                  "hover:border-accent-primary/30 hover:text-accent-primary",
                )}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Novo relatório
              </Link>
              <button
                type="button"
                onClick={actions.onExportPdf}
                disabled={actions.pdfDisabled || actions.pdfBusy}
                aria-busy={actions.pdfBusy}
                className={cn(
                  "w-full inline-flex items-center justify-center gap-2 rounded-lg h-9 px-4",
                  "bg-accent-primary text-white text-[13px] font-semibold shadow-sm",
                  "transition-colors duration-150 hover:bg-accent-primary/90",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {actions.pdfBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="size-4" aria-hidden="true" />
                )}
                Exportar PDF
              </button>

              <ShareReportPopover
                result={result}
                variant="ghost"
                triggerLabel="Partilhar"
                className={cn(
                  "w-full inline-flex items-center justify-center gap-2 rounded-lg h-9 px-4",
                  "bg-white border border-border-default text-content-secondary text-[13px] font-medium",
                  "transition-colors duration-150",
                  "hover:border-accent-primary/30 hover:text-accent-primary",
                )}
              />

              <button
                type="button"
                className={cn(
                  "w-full inline-flex items-center justify-center gap-2 rounded-lg h-9 px-4",
                  "bg-white border border-border-default text-content-secondary text-[13px] font-medium",
                  "transition-colors duration-150",
                  "hover:border-accent-primary/30 hover:text-accent-primary",
                )}
              >
                <Settings className="size-4" aria-hidden="true" />
                Configurar
              </button>
            </div>
          </div>

          {/* ── FOOTER: Comparison + Multi-network + Date ──────────── */}
          <div className="border-t border-border-default px-5 sm:px-6 py-2.5 flex items-center justify-between gap-4 flex-wrap text-xs text-content-tertiary">
            <span className="inline-flex items-center gap-1.5">
              👥 Comparar com concorrentes
              <span className="inline-flex items-center rounded-full bg-accent-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-primary">
                Pro
              </span>
              <ChevronRight className="size-3" aria-hidden="true" />
            </span>

            <span className="hidden sm:inline-flex items-center gap-1.5">
              Facebook · TikTok · YouTube
              <span className="inline-flex items-center rounded-full bg-signal-danger/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-signal-danger">
                Em breve
              </span>
            </span>

            {analysisMeta.dateLabel && (
              <span className="hidden lg:inline text-xs text-content-tertiary">
                {analysisMeta.dateLabel?.replace("Atualizado ", "")}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

interface StatItem {
  label: string;
  value: string;
}

function buildProfileStats(input: {
  postsCount: number;
  followers: number;
  following: number;
}): StatItem[] {
  return [
    {
      label: "seguidores",
      value: input.followers > 0 ? formatCompact(input.followers) : "—",
    },
    {
      label: "publicações",
      value: input.postsCount > 0 ? formatCompact(input.postsCount) : "—",
    },
    {
      label: "a seguir",
      value: input.following > 0 ? formatCompact(input.following) : "—",
    },
  ];
}

function buildAnalysisMeta(input: {
  postsAnalyzed: number;
  windowDays: number;
  analyzedAt: string;
}): { postsLabel: string | null; dateLabel: string | null } {
  let postsLabel: string | null = null;
  if (input.postsAnalyzed > 0 && input.windowDays > 0) {
    postsLabel = `${input.postsAnalyzed} posts em ${input.windowDays} dias`;
  } else if (input.postsAnalyzed > 0) {
    postsLabel = `${input.postsAnalyzed} posts analisados`;
  }

  let dateLabel: string | null = null;
  if (input.analyzedAt) {
    dateLabel = `Atualizado ${input.analyzedAt}`;
  }

  return { postsLabel, dateLabel };
}

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

function Avatar({
  avatarUrl,
  fullName,
}: {
  avatarUrl: string | null;
  fullName: string;
}) {
  const initials = fullName
    .replace(/^@/, "")
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const sizeMobile = "size-14 md:size-[72px]";

  if (avatarUrl) {
    return (
      <div className="shrink-0 rounded-full border-2 border-border-default p-[2px]">
        <img
          src={`/api/public/ig-thumb?url=${encodeURIComponent(avatarUrl)}`}
          alt={`Avatar de ${fullName}`}
          loading="eager"
          decoding="async"
          className={cn("rounded-full object-cover bg-surface-muted", sizeMobile)}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>
    );
  }

  return (
    <div className="shrink-0 rounded-full border-2 border-border-default p-[2px]" aria-hidden="true">
      <div
        className={cn(
          "rounded-full flex items-center justify-center",
          "font-display text-lg md:text-xl font-semibold text-content-tertiary",
          "bg-surface-muted",
          sizeMobile,
        )}
      >
        {initials}
      </div>
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span
      aria-label="Conta verificada"
      title="Conta verificada"
      className="inline-flex items-center justify-center shrink-0 size-[18px] md:size-5 rounded-full bg-accent-primary text-white shadow-[0_1px_2px_rgba(15,23,42,0.15)]"
    >
      <Check
        className="size-2.5 md:size-3"
        strokeWidth={3.5}
        aria-hidden="true"
      />
    </span>
  );
}

function PlatformPill() {
  return (
    <span
      aria-label="Plataforma analisada: Instagram"
      title="Instagram"
      className="inline-flex items-center gap-1 rounded-full bg-tint-warning px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-signal-warning ring-1 ring-signal-warning/20"
    >
      Instagram
    </span>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-signal-success/10 px-2 py-0.5 text-[10px] font-semibold text-signal-success"
    >
      <span className="size-1.5 rounded-full bg-signal-success shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
