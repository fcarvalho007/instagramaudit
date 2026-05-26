import { Heart, MessageCircle, ImageOff, TrendingUp, TrendingDown } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { formatNumber } from "@/lib/i18n/format";
import type { SupportedLanguage } from "@/i18n";
import { InsightCallout } from "./overview/insight-callout";

type EnrichedPost = ReportEnriched["topPosts"][number];
type TR = TFunction<"report", undefined>;

interface PostComparisonBlockProps {
  topPosts: EnrichedPost[];
  bottomPosts: EnrichedPost[];
  /** Raw AI insight text for the comparative diagnostic. */
  aiInsightText?: string | null;
  windowLabel?: string;
}

/** Map internal format to pt-PT chip label */
function formatChipLabel(format: string, t: TR): string {
  switch (format) {
    case "Carousel":
      return t("posts.format_chip.carousel");
    default:
      return format.toUpperCase();
  }
}

/**
 * "Variante 2 · Pódio e Perigo"
 * 2 best vs 2 worst posts with central divider, VS bar, and AI reading card.
 */
export function PostComparisonBlock({
  topPosts,
  bottomPosts,
  aiInsightText,
  windowLabel,
}: PostComparisonBlockProps) {
  const { t } = useTranslation("report");
  const { language } = useLanguage();
  const bestLabels = [t("posts.rank.best_1"), t("posts.rank.best_2")] as const;
  const worstLabels = [t("posts.rank.worst_1"), t("posts.rank.worst_2")] as const;
  const best2 = topPosts.slice(0, 2);
  const worst2 = bottomPosts.slice(0, 2);
  const hasComparison = best2.length > 0 && worst2.length > 0;

  const bestEng = best2[0]?.engagementPct ?? 0;
  const worstEng = worst2[worst2.length - 1]?.engagementPct ?? 0;
  const multiplier = useMemo(
    () => (worstEng > 0 ? Math.round(bestEng / worstEng) : 0),
    [bestEng, worstEng],
  );
  const multiplierLabel = multiplier > 1 ? `${multiplier}×` : "";

  // Deterministic AI fallback when renderInsight returns nothing visible
  const aiFallback = useMemo(() => {
    if (!hasComparison) return null;
    const bestFormat = best2[0]?.format ?? "";
    const worstFormat = worst2[0]?.format ?? "";
    const bestHasCaption = (best2[0]?.caption ?? "").length > 20;
    const worstHasCaption = (worst2[0]?.caption ?? "").length > 20;

    let headline = t("posts.ai_fallback.default");
    if (bestFormat === "Reel" && worstFormat !== "Reel") {
      headline = t("posts.ai_fallback.reels");
    } else if (bestFormat === "Carousel" && worstFormat !== "Carousel") {
      headline = t("posts.ai_fallback.carousel");
    } else if (bestHasCaption && !worstHasCaption) {
      headline = t("posts.ai_fallback.caption");
    }

    const bestStr = formatNumber(bestEng, language, { maximumFractionDigits: 2 });
    const worstStr = formatNumber(worstEng, language, { maximumFractionDigits: 2 });
    const body = multiplierLabel
      ? t("posts.ai_fallback.body_mult", { best: bestStr, mult: multiplierLabel })
      : t("posts.ai_fallback.body_plain", { best: bestStr, worst: worstStr });

    return { headline, body };
  }, [hasComparison, best2, worst2, bestEng, worstEng, multiplierLabel, t, language]);

  return (
    <article className="rounded-2xl border border-border-default bg-surface-secondary shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-5 md:px-6 pt-6 md:pt-8 pb-4 space-y-2.5">
        <h3 className="font-display text-[1.2rem] sm:text-[1.5rem] md:text-[2rem] font-semibold tracking-tight text-content-primary leading-tight break-words">
          {t("posts.title")}
        </h3>
        <p className="text-[13px] md:text-[14px] text-content-secondary leading-snug">
          {t("posts.subtitle")}
        </p>
      </div>

      {hasComparison ? (
        <div className="px-5 md:px-6 pb-5 md:pb-6 space-y-4">
          {/* VS Bar */}
          <VsBar bestEng={bestEng} worstEng={worstEng} t={t} language={language} />

          {/* Main grid: best | divider | worst */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-5 md:gap-0">
            {/* Best column */}
            <div className="space-y-3 md:pr-6">
              {best2.map((post, i) => (
                <div key={post.id} className="space-y-1.5">
                  <RankRow
                    rank={i + 1}
                    label={bestLabels[i]}
                    tone="best"
                    mirror={false}
                  />
                  <PostCard post={post} tone="best" t={t} language={language} />
                </div>
              ))}
            </div>

            {/* Central divider — desktop only */}
            <CentralDivider multiplierLabel={multiplierLabel} t={t} />

            {/* Mobile-only horizontal difference marker */}
            <MobileDifferenceMarker multiplierLabel={multiplierLabel} t={t} />

            {/* Worst column */}
            <div className="space-y-3 md:pl-6">
              {worst2.map((post, i) => (
                <div key={post.id} className="space-y-1.5">
                  <RankRow
                    rank={i + 1}
                    label={worstLabels[i]}
                    tone="worst"
                    mirror={true}
                  />
                  <PostCard post={post} tone="worst" mirror t={t} language={language} />
                </div>
              ))}
            </div>
          </div>

          {/* AI / Editorial reading */}
          <AiReading aiText={aiInsightText} fallback={aiFallback} t={t} />
        </div>
      ) : (
        <div className="px-5 md:px-6 pb-5 md:pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {best2.map((post) => (
              <PostCard key={post.id} post={post} tone="best" t={t} language={language} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

// ─── VS Bar ─────────────────────────────────────────────────────────

function VsBar({ bestEng, worstEng, t, language }: { bestEng: number; worstEng: number; t: TR; language: SupportedLanguage }) {
  const worstBarPct = bestEng > 0 ? Math.max(8, (worstEng / bestEng) * 100) : 50;

  return (
    <div
      className="relative flex items-stretch justify-between gap-3 rounded-xl border border-border-subtle px-4 py-3 md:px-6 md:py-4 overflow-hidden"
      style={{
        background:
          "linear-gradient(90deg, rgba(37,99,217,0.04) 0%, transparent 35%, transparent 65%, rgba(217,119,6,0.04) 100%)",
      }}
    >
      {/* Best side */}
      <div className="flex-1 min-w-0 flex flex-col items-start gap-0.5">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="size-3 text-accent-primary" aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-accent-primary">{t("posts.vs.best")}</span>
        </div>
        <span className="tabular-nums text-[18px] md:text-[22px] font-bold tabular-nums text-accent-primary leading-none">
          {formatNumber(bestEng, language, { maximumFractionDigits: 2 })}%
        </span>
        <div className="w-full h-1.5 rounded-full bg-accent-primary/10 mt-0.5">
          <div className="h-full rounded-full bg-accent-primary" style={{ width: "100%" }} />
        </div>
      </div>

      {/* VS badge — inline in-flow so it never overlaps */}
      <div className="shrink-0 self-center flex items-center justify-center size-9 md:size-10 rounded-full bg-white border border-border-default shadow-sm z-10">
        <span className="text-[11px] font-bold text-content-secondary tracking-wider">VS</span>
      </div>

      {/* Worst side */}
      <div className="flex-1 min-w-0 flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-signal-warning">{t("posts.vs.worst")}</span>
          <TrendingDown className="size-3 text-signal-warning" aria-hidden="true" />
        </div>
        <span className="tabular-nums text-[18px] md:text-[22px] font-bold tabular-nums text-signal-warning leading-none">
          {formatNumber(worstEng, language, { maximumFractionDigits: 2 })}%
        </span>
        <div className="w-full h-1.5 rounded-full bg-signal-warning/10 mt-0.5">
          <div
            className="h-full rounded-full bg-signal-warning ml-auto"
            style={{ width: `${worstBarPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Rank Row ───────────────────────────────────────────────────────

function RankRow({
  rank,
  label,
  tone,
  mirror,
}: {
  rank: number;
  label: string;
  tone: "best" | "worst";
  mirror: boolean;
}) {
  const badgeClasses =
    tone === "best"
      ? "bg-accent-primary text-white"
      : "bg-signal-warning text-white";

  const badge = (
    <span
      className={cn(
        "inline-flex items-center justify-center size-5 rounded-full text-[10px] font-bold",
        badgeClasses,
      )}
    >
      {rank}
    </span>
  );
  const labelEl = (
    <span className="text-[12px] font-semibold text-content-primary truncate">
      {label}
    </span>
  );

  if (mirror) {
    return (
      <div className="flex items-center gap-1.5">
        {labelEl}
        <span className="flex-1" />
        {badge}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {badge}
      {labelEl}
    </div>
  );
}

// ─── Central Divider (desktop) ──────────────────────────────────────

function CentralDivider({ multiplierLabel, t }: { multiplierLabel: string; t: TR }) {
  return (
    <div className="hidden md:flex flex-col items-center justify-center gap-2 px-5 min-w-[80px]">
      <div className="w-px flex-1 bg-border-subtle" />
      {multiplierLabel && (
        <div className="flex flex-col items-center gap-1 bg-surface-muted border border-border-subtle rounded-lg px-2.5 py-2">
          <span className="tabular-nums text-[18px] font-bold text-content-primary tabular-nums leading-none">
            {multiplierLabel}
          </span>
          <span className="text-[8px] font-bold uppercase tracking-widest text-content-tertiary text-center leading-tight">
            {t("posts.diff")}
          </span>
        </div>
      )}
      <div className="w-px flex-1 bg-border-subtle" />
    </div>
  );
}

// ─── Mobile Difference Marker ───────────────────────────────────────

function MobileDifferenceMarker({ multiplierLabel, t }: { multiplierLabel: string; t: TR }) {
  if (!multiplierLabel) return null;
  return (
    <div className="flex md:hidden items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border-subtle" />
      <div className="flex items-center gap-1.5 bg-surface-muted rounded-md px-2.5 py-1">
        <span className="tabular-nums text-[14px] font-bold text-content-primary tabular-nums">
          {multiplierLabel}
        </span>
        <span className="text-[8px] font-bold uppercase tracking-widest text-content-tertiary">
          {t("posts.diff")}
        </span>
      </div>
      <div className="h-px flex-1 bg-border-subtle" />
    </div>
  );
}

// ─── AI Reading (unified InsightCallout) ────────────────────────────

function AiReading({
  aiText,
  fallback,
  t,
}: {
  aiText?: string | null;
  fallback: { headline: string; body: string } | null;
  t: TR;
}) {
  const hasAi = !!aiText && aiText.trim().length > 10;

  return (
    <InsightCallout
      tone="ai"
      label={t("posts.callout_label")}
    >
      {hasAi ? (
        <p>{aiText}</p>
      ) : fallback ? (
        <div className="space-y-0.5">
          <p className="font-semibold">{fallback.headline}</p>
          <p className="text-content-secondary">{fallback.body}</p>
        </div>
      ) : null}
    </InsightCallout>
  );
}

// ─── Post Card ──────────────────────────────────────────────────────

function PostCard({
  post,
  tone,
  mirror = false,
  t,
  language,
}: {
  post: EnrichedPost;
  tone: "best" | "worst";
  mirror?: boolean;
  t: TR;
  language: SupportedLanguage;
}) {
  const [imgError, setImgError] = useState(false);

  const accentBorder =
    tone === "best" ? "border-t-accent-primary" : "border-t-signal-warning";
  const engColor =
    tone === "best" ? "text-accent-primary" : "text-signal-warning";

  const thumbUrl = (post as EnrichedPost & { thumbnailUrl?: string })
    .thumbnailUrl;
  const showImg = thumbUrl && !imgError;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-t-2 bg-white p-2.5 md:p-3",
        "border-border-default shadow-[0_1px_4px_-2px_rgba(0,0,0,0.05)]",
        accentBorder,
        mirror ? "md:flex-row-reverse" : "",
      )}
    >
      {/* Thumbnail — 3:4 aspect ratio */}
      <div className="relative shrink-0 w-[72px] md:w-[80px] aspect-[3/4] rounded-lg overflow-hidden bg-surface-muted">
        {showImg ? (
          <img
            src={thumbUrl}
            alt=""
            loading="lazy"
            onError={() => setImgError(true)}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-muted">
            <ImageOff
              className="size-4 text-content-tertiary/40"
              aria-hidden="true"
            />
          </div>
        )}
        {/* Format chip */}
        <span className="absolute top-1 left-1 z-10 text-[7px] font-bold uppercase tracking-[0.04em] px-1.5 py-[2px] rounded bg-white/85 backdrop-blur-sm text-content-primary leading-none shadow-sm">
          {formatChipLabel(post.format, t)}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-0.5">
        {/* Engagement — hero metric */}
        <span className={cn("tabular-nums text-[15px] font-bold tabular-nums leading-none", engColor)}>
          {formatNumber(post.engagementPct, language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
        </span>

        {/* Caption */}
        <p className="text-[11px] md:text-[12px] text-content-primary leading-snug line-clamp-2">
          {post.caption || t("posts.no_caption")}
        </p>

        {/* Likes + Comments */}
        <div className="flex items-center gap-2.5 pt-1 mt-auto border-t border-border-subtle/60">
          <span className="inline-flex items-center gap-1 text-[10px] text-content-secondary">
            <Heart className="size-2.5" aria-hidden="true" />
            <span className="tabular-nums tabular-nums">
              {formatNumber(post.likes, language)}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-content-secondary">
            <MessageCircle className="size-2.5" aria-hidden="true" />
            <span className="tabular-nums tabular-nums">{formatNumber(post.comments, language)}</span>
          </span>
          <span className="ml-auto text-[9px] text-content-tertiary uppercase tracking-wide">
            {post.date}
          </span>
        </div>
      </div>
    </div>
  );
}
