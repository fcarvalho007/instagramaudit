import { Check, Download, Loader2 } from "lucide-react";

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
 * Hero v2 — Premium identity card (Iconosquare-inspired).
 *
 * Two internal zones:
 *   Zone 1: avatar + handle + platform pill + bio + icon-only actions
 *   Zone 2: stats strip (followers / publications / following) + analysis meta
 */
export function ReportHeroV2({ result, actions }: ReportHeroV2Props) {
  const profile = result.data.profile;
  const enriched: ReportEnriched = result.enriched;

  const handle = `@${profile.username}`;
  const fullName = profile.fullName?.trim() || "";
  const bio = enriched.profile.bio;
  const avatarUrl = enriched.profile.avatarUrl;
  const verified = Boolean(profile.verified);

  const profileStats = buildProfileStats({
    postsCount: profile.postsCount ?? 0,
    followers: profile.followers ?? 0,
    following: profile.following ?? 0,
  });

  const analysisMeta = buildAnalysisMeta({
    postsAnalyzed: profile.postsAnalyzed ?? 0,
    windowDays: result.coverage.windowDays ?? 0,
    analyzedAt: profile.analyzedAt ?? "",
  });

  return (
    <section
      aria-label="Cabeçalho do relatório"
      className="w-full bg-[linear-gradient(180deg,#F0F4FF_0%,#F7FAFF_60%,#FAFBFD_100%)] pt-5 pb-2 md:pt-8 md:pb-4"
    >
      <div className="mx-auto max-w-[1380px] px-5 md:px-6">
        {/* Main card */}
        <div className="rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] overflow-hidden">
          {/* ── Zone 1: Identity ──────────────────────────────────── */}
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:gap-6 md:p-6 lg:p-7">
            {/* Avatar */}
            <Avatar avatarUrl={avatarUrl} fullName={fullName || handle} />

            {/* Handle + description */}
            <div className="min-w-0 flex-1 space-y-1.5">
              {/* Handle row */}
              <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                <h1 className="font-display text-xl sm:text-[1.375rem] md:text-2xl font-semibold tracking-[-0.015em] text-slate-900 leading-tight break-words">
                  {handle}
                </h1>
                {verified && <VerifiedBadge />}
                <PlatformPill />
              </div>

              {/* Name + bio */}
              {(fullName || bio) && (
                <p className="text-sm text-slate-600 leading-relaxed line-clamp-1 max-w-xl">
                  {[fullName, bio].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>

            {/* Icon-only actions */}
            <div className="flex items-center gap-2 shrink-0">
              <IconButton
                aria-label="Exportar relatório em PDF"
                title="Exportar PDF"
                onClick={actions.onExportPdf}
                disabled={actions.pdfDisabled || actions.pdfBusy}
                busy={actions.pdfBusy}
              >
                {actions.pdfBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="size-4" aria-hidden="true" />
                )}
              </IconButton>

              <ShareReportPopover
                result={result}
                variant="ghost"
                triggerLabel=""
                className="inline-flex items-center justify-center size-[34px] rounded-lg border border-slate-200/80 bg-white text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300"
              />
            </div>
          </div>

          {/* ── Zone 2: Stats ─────────────────────────────────────── */}
          <div className="border-t border-slate-200/60 bg-slate-50/60 px-5 md:px-6 lg:px-7 py-4 md:py-5">
            <div className="flex flex-wrap items-start gap-x-0 gap-y-3">
              {/* Profile stats */}
              <div className="flex flex-wrap items-start gap-0">
                {profileStats.map((s, i) => (
                  <div
                    key={s.label}
                    className={cn(
                      "flex flex-col items-start gap-0.5 px-4 md:px-5 first:pl-0",
                      i > 0 && "border-l border-slate-200/60",
                    )}
                  >
                    <span className="font-mono text-lg md:text-xl font-semibold text-slate-900 tabular-nums leading-none tracking-[-0.01em]">
                      {s.value}
                    </span>
                    <span className="text-eyebrow-sm text-slate-500 uppercase">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Analysis metadata */}
              {(analysisMeta.postsLabel || analysisMeta.dateLabel) && (
                <div className="flex items-center gap-3 ml-auto">
                  {analysisMeta.postsLabel && (
                    <span className="text-eyebrow-sm text-slate-500">
                      {analysisMeta.postsLabel}
                    </span>
                  )}
                  {analysisMeta.dateLabel && (
                    <span className="inline-flex items-center gap-1.5 text-eyebrow-sm text-slate-500">
                      <span
                        className="size-1.5 rounded-full bg-emerald-500"
                        aria-hidden="true"
                      />
                      {analysisMeta.dateLabel}
                    </span>
                  )}
                </div>
              )}
            </div>
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
    dateLabel = `analisado ${input.analyzedAt}`;
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

  const ringClass =
    "p-[2px] rounded-full shrink-0 bg-gradient-to-br from-slate-300 via-slate-200 to-slate-300";
  const innerWhite = "p-[2px] rounded-full bg-white";
  const sizeMobile = "size-14 md:size-[76px]";

  if (avatarUrl) {
    return (
      <div className={ringClass}>
        <div className={innerWhite}>
          <img
            src={`/api/public/ig-thumb?url=${encodeURIComponent(avatarUrl)}`}
            alt={`Avatar de ${fullName}`}
            loading="eager"
            decoding="async"
            className={cn("rounded-full object-cover bg-white", sizeMobile)}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={ringClass} aria-hidden="true">
      <div className={innerWhite}>
        <div
          className={cn(
            "rounded-full flex items-center justify-center",
            "font-display text-lg md:text-xl font-semibold text-slate-500",
            "bg-slate-100",
            sizeMobile,
          )}
        >
          {initials}
        </div>
      </div>
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span
      aria-label="Conta verificada"
      title="Conta verificada"
      className="inline-flex items-center justify-center shrink-0 size-[18px] md:size-5 rounded-full bg-blue-500 text-white shadow-[0_1px_2px_rgba(15,23,42,0.15)]"
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
      className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200/70"
    >
      Instagram
    </span>
  );
}

function IconButton({
  children,
  busy,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  return (
    <button
      type="button"
      aria-busy={busy}
      className={cn(
        "inline-flex items-center justify-center size-[34px] rounded-lg",
        "border border-slate-200/80 bg-white text-slate-600",
        "transition-colors duration-150",
        "hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
      {...props}
    >
      {children}
    </button>
  );
}
