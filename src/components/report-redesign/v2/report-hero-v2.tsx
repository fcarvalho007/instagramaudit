import { useState } from "react";
import { Check, Download, Loader2, Share2 } from "lucide-react";
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
  className?: string;
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
  className,
}: ReportHeroV2Props) {
  const { t } = useTranslation("report");
  const { language } = useLanguage();
  const profile = result.data.profile;
  const enriched: ReportEnriched = result.enriched;

  const handle = `@${profile.username}`;
  const handleWrappable = handle.replace(/\./g, ".\u200B");
  const fullName = profile.fullName?.trim() || "";
  const avatarUrl = enriched.profile.avatarUrl;
  const verified = Boolean(profile.verified);

  const followers = profile.followers ?? 0;
  const postsCount = profile.postsCount ?? 0;
  const tierLabel = followers > 0 ? getTierLabel(getTierForFollowers(followers)) : null;
  const tierBadge = tierLabel ? `${t("hero.tier_label_prefix")} · ${tierLabel}` : null;

  return (
    <section
      aria-label={handle}
      className={cn("min-w-0 flex-1 flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-1.5 sm:py-2", className)}
    >
      {/* Identity */}
      <CompactAvatar
        avatarUrl={avatarUrl}
        fullName={fullName || handle}
        verified={verified}
        t={t}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-display text-[13px] sm:text-[15px] font-semibold text-content-primary tracking-tight truncate leading-tight">
            {handleWrappable}
          </span>
          {tierBadge && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-surface-muted text-[11px] font-medium text-content-secondary border border-border-default whitespace-nowrap">
              {tierBadge}
            </span>
          )}
        </div>
        <CompactMetricLine
          followers={followers}
          postsCount={postsCount}
          language={language}
          t={t}
        />
      </div>

      {/* Actions — PDF + Share only */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        <button
          type="button"
          onClick={actions.onExportPdf}
          disabled={actions.pdfDisabled || actions.pdfBusy}
          aria-busy={actions.pdfBusy}
          aria-label={t("hero.actions.pdf")}
          title={t("hero.actions.pdf")}
          className={cn(
            "inline-flex items-center justify-center size-7 sm:size-9 rounded-lg",
            "border border-border-default bg-white text-content-secondary",
            "transition-colors duration-150",
            "hover:bg-surface-muted hover:border-border-strong hover:text-content-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {actions.pdfBusy ? (
            <Loader2 className="size-3 sm:size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="size-3 sm:size-4" aria-hidden="true" />
          )}
        </button>
        <ShareReportPopover
          result={result}
          customTrigger={
            <button
              type="button"
              aria-label={t("hero.actions.share")}
              title={t("hero.actions.share")}
              className={cn(
                "inline-flex items-center justify-center size-7 sm:size-9 rounded-lg",
                "border border-border-default bg-white text-content-secondary",
                "transition-colors duration-150",
                "hover:bg-surface-muted hover:border-border-strong hover:text-content-primary",
              )}
            >
              <Share2 className="size-3 sm:size-4" aria-hidden="true" />
            </button>
          }
        />
      </div>
    </section>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

// ─── Sub-components ──────────────────────────────────────────────────

function CompactMetricLine({
  followers,
  postsCount,
  language,
  t,
}: {
  followers: number;
  postsCount: number;
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
  if (parts.length === 0) return null;
  return (
    <p className="mt-0.5 text-[12px] sm:text-[13px] text-content-secondary leading-tight flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 truncate">
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

function CompactAvatar(props: AvatarProps) {
  return <BaseAvatar {...props} sizeClass="size-8 sm:size-10" badgeSizeClass="size-3 sm:size-4" checkSize="size-2 sm:size-2.5" />;
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

