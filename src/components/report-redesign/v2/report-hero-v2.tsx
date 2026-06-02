import { useId, useState } from "react";
import { Check, ChevronDown, Download, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import type {
  AdapterResult,
  ReportEnriched,
} from "@/lib/report/snapshot-to-report-data";
import type { ReportPageActions } from "@/components/report/report-page";
import { ShareReportPopover } from "@/components/report-share/share-popover";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { formatCompactNumber } from "@/lib/i18n/format";
import { getTierForFollowers, getTierLabel } from "@/lib/benchmark/tiers";

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
  const tierLabel = followers > 0 ? getTierLabel(getTierForFollowers(followers)) : null;

  const [expanded, setExpanded] = useState(false);
  const expandedId = useId();

  const toggleExpanded = () => setExpanded((prev) => !prev);

  return (
    <section
      aria-label={handle}
      className="w-full px-5 md:px-6 pt-3 pb-2"
    >
      <div className="mx-auto max-w-[1520px]">
        <div
          className={cn(
            "rounded-2xl border border-border-default bg-white shadow-card overflow-hidden",
            "transition-all duration-200",
          )}
        >
          {/* ── COMPACT BAR (sempre visível) ─────────────────────── */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3">
            {/* Identity */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <CompactAvatar
                avatarUrl={avatarUrl}
                fullName={fullName || handle}
                verified={verified}
                t={t}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="font-display text-[15px] sm:text-base font-semibold text-content-primary tracking-tight truncate min-w-0">
                    {handleWrappable}
                  </span>
                  {tierLabel && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-surface-muted text-[11px] font-medium text-content-secondary border border-border-default whitespace-nowrap">
                      {tierLabel}
                    </span>
                  )}
                </div>
                <CompactMetricLine
                  followers={followers}
                  postsCount={postsCount}
                  postsAnalyzed={postsAnalyzed}
                  language={language}
                  t={t}
                />
              </div>
              <button
                type="button"
                onClick={toggleExpanded}
                aria-expanded={expanded}
                aria-controls={expandedId}
                aria-label={t(expanded ? "hero.actions.collapse" : "hero.actions.expand")}
                title={t(expanded ? "hero.actions.collapse" : "hero.actions.expand")}
                className="shrink-0 inline-flex items-center justify-center size-8 rounded-lg text-content-tertiary hover:text-content-primary hover:bg-surface-muted transition-colors"
              >
                <ChevronDown
                  className={cn(
                    "size-4 transition-transform duration-200",
                    expanded && "rotate-180",
                  )}
                  aria-hidden="true"
                />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={actions.onExportPdf}
                disabled={actions.pdfDisabled || actions.pdfBusy}
                aria-busy={actions.pdfBusy}
                aria-label={t("hero.actions.pdf")}
                title={t("hero.actions.pdf")}
                className={cn(
                  "inline-flex items-center justify-center size-9 rounded-lg",
                  "border border-border-default bg-white text-content-secondary",
                  "transition-colors duration-150",
                  "hover:bg-surface-muted hover:border-border-strong hover:text-content-primary",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {actions.pdfBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="size-4" aria-hidden="true" />
                )}
              </button>
              <ShareReportPopover
                result={result}
                variant="ghost"
                triggerLabel=""
                aria-label={t("hero.actions.share")}
                className={cn(
                  "inline-flex items-center justify-center size-9 rounded-lg",
                  "border border-border-default bg-white text-content-secondary",
                  "transition-colors duration-150",
                  "hover:bg-surface-muted hover:border-border-strong hover:text-content-primary",
                )}
              />
            </div>
          </div>

          {/* ── EXPANDED PANEL ───────────────────────────────────── */}
          {expanded && (
            <div
              id={expandedId}
              className="border-t border-border-default px-5 sm:px-8 py-6 sm:py-7 bg-surface-muted/30"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-7">
                <ExpandedAvatar
                  avatarUrl={avatarUrl}
                  fullName={fullName || handle}
                  verified={verified}
                  t={t}
                />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <h1 className="font-display text-[1.5rem] sm:text-[2rem] font-bold tracking-[-0.03em] text-content-primary leading-[1.1] [overflow-wrap:anywhere] min-w-0">
                    {handleWrappable}
                  </h1>
                  {fullName && (
                    <p className="text-[15px] font-medium text-content-secondary leading-snug">
                      {fullName}
                    </p>
                  )}
                  <ExpandedMetricLine
                    followers={followers}
                    postsCount={postsCount}
                    postsAnalyzed={postsAnalyzed}
                    language={language}
                    t={t}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

// ─── Sub-components ──────────────────────────────────────────────────

function CompactMetricLine({
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
    parts.push({
      value: String(postsAnalyzed),
      label: t(postsAnalyzed === 1 ? "hero.metric_analyzed_one" : "hero.metric_analyzed"),
    });
  }
  if (parts.length === 0) return null;
  return (
    <p className="mt-0.5 text-[13px] text-content-secondary leading-tight flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
      {parts.map((p, i) => (
        <span key={p.label} className="inline-flex items-baseline gap-1">
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

function ExpandedMetricLine({
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

function CompactAvatar(props: AvatarProps) {
  return <BaseAvatar {...props} sizeClass="size-10" badgeSizeClass="size-4" checkSize="size-2.5" />;
}

function ExpandedAvatar(props: AvatarProps) {
  return <BaseAvatar {...props} sizeClass="size-16 md:size-24" badgeSizeClass="size-5 md:size-6" checkSize="size-3 md:size-3.5" />;
}

interface AvatarProps {
  avatarUrl: string | null;
  fullName: string;
  verified: boolean;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

function BaseAvatar({
  avatarUrl,
  fullName,
  verified,
  t,
  sizeClass,
  badgeSizeClass,
  checkSize,
}: AvatarProps & { sizeClass: string; badgeSizeClass: string; checkSize: string }) {
  const [failed, setFailed] = useState(false);
  const initials = fullName
    .replace(/^@/, "")
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

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
        "font-display font-semibold text-content-tertiary",
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
          className={cn(
            "absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-signal-success text-white ring-2 ring-white shadow-[0_1px_3px_rgba(15,23,42,0.18)]",
            badgeSizeClass,
          )}
        >
          <Check className={checkSize} strokeWidth={3.5} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

