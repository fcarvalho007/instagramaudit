import { useState } from "react";
import { Check, Download, Plus, Users, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type {
  AdapterResult,
  ReportEnriched,
} from "@/lib/report/snapshot-to-report-data";
import type { ReportPageActions } from "@/components/report/report-page";
import { ShareReportPopover } from "@/components/report-share/share-popover";
import { CompetitorModal } from "./overview/competitor-modal";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { formatCompactNumber } from "@/lib/i18n/format";
import { usePublicAppConfig } from "@/lib/config/use-app-config";

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
  const { t } = useTranslation("report");
  const { language } = useLanguage();
  const { compareEnabled } = usePublicAppConfig();
  const profile = result.data.profile;
  const enriched: ReportEnriched = result.enriched;

  const handle = `@${profile.username}`;
  // Insert zero-width space after each "." so long handles wrap at dot
  // boundaries instead of mid-word on narrow mobile viewports.
  const handleWrappable = handle.replace(/\./g, ".\u200B");
  const fullName = profile.fullName?.trim() || "";
  const avatarUrl = enriched.profile.avatarUrl;
  const verified = Boolean(profile.verified);

  const followers = profile.followers ?? 0;
  const postsCount = profile.postsCount ?? 0;
  const postsAnalyzed = profile.postsAnalyzed ?? 0;

  const [compareOpen, setCompareOpen] = useState(false);

  return (
    <section
      aria-label={t("hero.actions.new_report")}
      className="w-full px-5 md:px-6 pt-5 pb-4"
    >
      <div className="mx-auto max-w-[1520px]">
        {/* ── HERO CARD ──────────────────────────────────────────── */}
        <div className="relative rounded-2xl border border-border-default bg-white shadow-card overflow-hidden">
          {/* Prism glass decoration — desktop only */}
          <PrismDecoration />

          <div className="relative px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10 flex flex-col lg:flex-row lg:items-center gap-10 lg:gap-14">

            {/* ── Identity ─────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 flex items-center gap-4 lg:gap-7">
              <Avatar
                avatarUrl={avatarUrl}
                fullName={fullName || handle}
                verified={verified}
                language={language}
                t={t}
              />
              <div className="min-w-0 flex-1 space-y-1">
                <h1 className="font-display text-[1.25rem] sm:text-[1.75rem] lg:text-[2.25rem] font-bold tracking-[-0.03em] text-content-primary leading-[1.1] [overflow-wrap:anywhere] min-w-0">
                  {handleWrappable}
                </h1>
                {fullName && (
                  <p className="text-[15px] font-medium text-content-secondary leading-snug">
                    {fullName}
                  </p>
                )}
                <MetricLine
                  followers={followers}
                  postsCount={postsCount}
                  postsAnalyzed={postsAnalyzed}
                  language={language}
                  t={t}
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
                {t("hero.actions.new_report")}
              </Link>

              <button
                type="button"
                onClick={() => setCompareOpen(true)}
                title={compareEnabled ? t("hero.actions.compare") : t("hero.actions.coming_soon_tooltip")}
                className={cn(
                  "inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl min-h-12 px-4 py-2 min-w-0",
                  "border border-border-default bg-white text-content-primary text-[15px] font-semibold",
                  "transition-colors duration-150",
                  "hover:border-accent-primary/40 hover:text-accent-primary hover:bg-accent-primary/[0.04]",
                )}
              >
                <Users className="size-4" aria-hidden="true" />
                {t("hero.actions.compare")}
                {!compareEnabled && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-content-secondary border border-border-default whitespace-nowrap">
                    <span>{t("hero.actions.coming_soon")}</span>
                    <span className="hidden sm:inline text-content-tertiary normal-case font-medium">· {t("hero.actions.coming_soon_detail")}</span>
                  </span>
                )}
              </button>

              <div className="mt-1 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={actions.onExportPdf}
                  disabled={actions.pdfDisabled || actions.pdfBusy}
                  aria-busy={actions.pdfBusy}
                  title={t("hero.actions.pdf")}
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
                  {t("hero.actions.pdf")}
                </button>
                <ShareReportPopover
                  result={result}
                  variant="ghost"
                  triggerLabel={t("hero.actions.share")}
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

// ─── Sub-components ──────────────────────────────────────────────────

function MetricLine({
  followers,
  postsCount,
  postsAnalyzed,
  language,
  t,
}: {
  followers: number;
  postsCount: number;
  postsAnalyzed: number;
  language: "pt" | "en";
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const fmt = (n: number) => formatCompactNumber(n, language);
  const parts: Array<{ value: string; label: string }> = [];
  if (followers > 0) {
    parts.push({
      value: fmt(followers),
      label: t(followers === 1 ? "hero.metric_followers_one" : "hero.metric_followers"),
    });
  }
  if (postsCount > 0) {
    parts.push({
      value: fmt(postsCount),
      label: t(postsCount === 1 ? "hero.metric_posts_one" : "hero.metric_posts"),
    });
  }
  if (postsAnalyzed > 0) {
    // Sample size only — the observed-days information lives in the
    // analysis-period selector mounted right below the hero, so the header
    // doesn't promise a temporal window the free tier doesn't deliver.
    const label = t(
      postsAnalyzed === 1 ? "hero.metric_analyzed_one" : "hero.metric_analyzed",
    );
    parts.push({
      value: String(postsAnalyzed),
      label,
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
  language: _language,
  t,
}: {
  avatarUrl: string | null;
  fullName: string;
  verified: boolean;
  language: "pt" | "en";
  t: (k: string, opts?: Record<string, unknown>) => string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = fullName
    .replace(/^@/, "")
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const sizeClass = "size-16 md:size-28";

  const showImage = Boolean(avatarUrl) && !failed;
  const inner = showImage ? (
    <img
      src={avatarUrl as string}
      alt={t("hero.avatar_alt", { name: fullName })}
      loading="eager"
      decoding="async"
      className={cn("rounded-full object-cover bg-surface-muted", sizeClass)}
      onError={() => setFailed(true)}
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
          aria-label={t("hero.verified")}
          title={t("hero.verified")}
          className="absolute bottom-0.5 right-0.5 inline-flex items-center justify-center size-5 md:size-7 rounded-full bg-signal-success text-white ring-2 ring-white shadow-[0_1px_3px_rgba(15,23,42,0.18)]"
        >
          <Check className="size-3.5 md:size-4" strokeWidth={3.5} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

