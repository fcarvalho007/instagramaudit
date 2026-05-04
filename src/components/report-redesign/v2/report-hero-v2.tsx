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
 * Hero v2 — Premium 2-zone identity card (Iconosquare-inspired).
 *
 *   Zone 1: avatar + handle + platform pill + bio + icon-only actions
 *   Zone 2: stats (followers / publications / following) + analysis meta
 *
 * Zone 3 (auxiliary action row) is rendered separately by ComparisonHeader
 * and positioned in report-shell-v2.tsx below this card.
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
      className="w-full bg-[linear-gradient(180deg,#F6FAFF_0%,#FFFFFF_100%)] px-4 sm:px-6 lg:px-8 py-6"
    >
      <div className="mx-auto max-w-[1380px]">
        {/* Main card */}
        <div className="rounded-2xl border border-border-default bg-surface-secondary shadow-card overflow-hidden">
          {/* ── Zone 1: Identity ──────────────────────────────────── */}
          <div className="flex flex-col gap-4 p-5 sm:p-6 border-b border-border-subtle md:flex-row md:items-center md:gap-6">
            {/* Avatar */}
            <Avatar avatarUrl={avatarUrl} fullName={fullName || handle} />

            {/* Handle + description */}
            <div className="min-w-0 flex-1 space-y-1.5">
              {/* Handle row */}
              <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-[-0.015em] text-content-primary leading-tight break-words">
                  {handle}
                </h1>
                {verified && <VerifiedBadge />}
                <PlatformPill />
              </div>

              {/* Name + bio */}
              {(fullName || bio) && (
                <p className="text-sm text-content-secondary leading-relaxed line-clamp-1 max-w-xl">
                  {[fullName, bio].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>

            {/* Icon-only actions */}
            <div className="flex items-center gap-2 shrink-0">
              <IconButton
                aria-label="Exportar relatório em PDF"
                title="Exportar relatório em PDF"
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
                aria-label="Partilhar relatório"
                className={cn(
                  "inline-flex items-center justify-center size-[34px] rounded-lg",
                  "bg-surface-secondary border border-border-default text-content-secondary",
                  "transition-colors duration-150",
                  "hover:border-accent-primary/30 hover:text-accent-primary",
                )}
              />
            </div>
          </div>

          {/* ── Zone 2: Stats ─────────────────────────────────────── */}
          <div className="bg-surface-muted/50 px-5 sm:px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-0">
              {/* First 3 stats */}
              {profileStats.map((s, i) => (
                <div
                  key={s.label}
                  className={cn(
                    "flex flex-col items-start gap-0.5 px-4 sm:px-5 first:pl-0",
                    i > 0 && "sm:border-l sm:border-border-subtle",
                  )}
                >
                  <span className="font-mono text-xl sm:text-2xl font-semibold text-content-primary tabular-nums leading-none">
                    {s.value}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-content-tertiary">
                    {s.label}
                  </span>
                </div>
              ))}

              {/* 4th segment: analysis metadata */}
              <div
                className={cn(
                  "flex flex-col items-start gap-0.5 px-4 sm:px-5",
                  "sm:border-l sm:border-border-subtle",
                )}
              >
                {analysisMeta.postsLabel && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-content-tertiary">
                    <span
                      className="size-1.5 rounded-full bg-signal-success"
                      aria-hidden="true"
                    />
                    {analysisMeta.postsLabel}
                  </span>
                )}
                {analysisMeta.dateLabel && (
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-content-tertiary">
                    {analysisMeta.dateLabel}
                  </span>
                )}
              </div>
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

  /* Local decorative gradient ring — no semantic token for avatar rings */
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
            "font-display text-lg md:text-xl font-semibold text-content-tertiary",
            "bg-surface-muted",
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
        "bg-surface-secondary border border-border-default text-content-secondary",
        "transition-colors duration-150",
        "hover:border-accent-primary/30 hover:text-accent-primary",
        "disabled:cursor-not-allowed disabled:opacity-50",
      )}
      {...props}
    >
      {children}
    </button>
  );
}
