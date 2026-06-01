import {
  Heart,
  MessageCircle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Lock,
  GalleryHorizontalEnd,
  Play,
  Image as ImageIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { formatNumber } from "@/lib/i18n/format";
import type { SupportedLanguage } from "@/i18n";
import { InsightCallout } from "./overview/insight-callout";
import { PremiumInterestDialog } from "./premium-interest-dialog";
import { useReportTracking } from "./report-tracking-context";
import { trackEvent } from "@/lib/tracking.functions";

type EnrichedPost = ReportEnriched["topPosts"][number];
type TR = TFunction<"report", undefined>;

interface PostComparisonBlockProps {
  topPosts: EnrichedPost[];
  bottomPosts: EnrichedPost[];
  /** Raw AI insight text for the comparative diagnostic. */
  aiInsightText?: string | null;
  windowLabel?: string;
  /** Variant for the scatter rendering. Default sober. */
  scatterVariant?: "sober" | "fog" | "glass";
}

/** Map internal format to pt-PT chip label */
function formatChipLabel(format: string, t: TR): string {
  switch (format) {
    case "Carousel":
      return t("posts.format_chip.carousel");
    case "Reel":
      return t("posts.format_chip.reel");
    case "Imagem":
      return t("posts.format_chip.image");
    default:
      return format.toUpperCase();
  }
}

function FormatIcon({
  format,
  className,
}: {
  format: string;
  className?: string;
}) {
  if (format === "Carousel")
    return <GalleryHorizontalEnd className={className} aria-hidden="true" />;
  if (format === "Reel") return <Play className={className} aria-hidden="true" />;
  return <ImageIcon className={className} aria-hidden="true" />;
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
  scatterVariant = "sober",
}: PostComparisonBlockProps) {
  const { t } = useTranslation("report");
  const { language } = useLanguage();

  const best = topPosts[0];
  const worst = bottomPosts[bottomPosts.length - 1];
  const hasComparison = !!best && !!worst && best.id !== worst.id;

  const bestEng = best?.engagementPct ?? 0;
  const worstEng = worst?.engagementPct ?? 0;
  const multiplier = useMemo(
    () => (worstEng > 0 ? Math.round(bestEng / worstEng) : 0),
    [bestEng, worstEng],
  );
  const multiplierLabel = multiplier > 1 ? `${multiplier}×` : "";

  // All posts visible in the window (already sorted by engagement desc).
  const allPosts = topPosts;
  const total = allPosts.length;
  const avgEng = useMemo(() => {
    if (total === 0) return 0;
    return allPosts.reduce((s, p) => s + p.engagementPct, 0) / total;
  }, [allPosts, total]);

  const bestDelta = avgEng > 0 ? ((bestEng - avgEng) / avgEng) * 100 : 0;
  const worstDelta = avgEng > 0 ? ((worstEng - avgEng) / avgEng) * 100 : 0;

  // Deterministic prescriptive fallback when AI text is missing.
  const aiFallback = useMemo(() => {
    if (!hasComparison) return null;
    const bestFormat = best?.format ?? "";
    const worstFormat = worst?.format ?? "";
    const bestHasCaption = (best?.caption ?? "").length > 20;
    const worstHasCaption = (worst?.caption ?? "").length > 20;

    let headline = t("posts.ai_fallback.default");
    if (bestFormat === "Reel" && worstFormat !== "Reel") {
      headline = t("posts.ai_fallback.reels");
    } else if (bestFormat === "Carousel" && worstFormat !== "Carousel") {
      headline = t("posts.ai_fallback.carousel");
    } else if (bestHasCaption && !worstHasCaption) {
      headline = t("posts.ai_fallback.caption");
    }

    const body = t("posts.ai_fallback.body_prescriptive", {
      bestFormat: bestFormat || t("posts.format_chip.image"),
    });

    return { headline, body };
  }, [hasComparison, best, worst, t]);

  return (
    <article className="rounded-2xl border border-border-default bg-surface-secondary shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-5 md:px-6 pt-6 md:pt-8 pb-4 space-y-2">
        <h3 className="font-display text-[1.5rem] sm:text-[1.75rem] md:text-[2rem] font-semibold tracking-tight text-content-primary leading-tight break-words">
          {t("posts.title")}
        </h3>
        <p className="text-eyebrow-sm text-content-tertiary">
          {windowLabel ? t("posts.subtitle_with_window", { window: windowLabel }) : t("posts.subtitle")}
        </p>
      </div>

      {hasComparison && best && worst ? (
        <div className="px-5 md:px-6 pb-6 md:pb-8 space-y-6">
          {/* 1. Comparative Hero */}
          <ComparativeHero
            best={best}
            worst={worst}
            multiplierLabel={multiplierLabel}
            t={t}
            language={language}
          />

          {/* 2. Constellation Scatter */}
          {total >= 3 && (
            <ConstellationScatter
              posts={allPosts}
              best={best}
              worst={worst}
              avg={avgEng}
              total={total}
              t={t}
              language={language}
              variant={scatterVariant}
            />
          )}

          {/* 3. Premium reveal — integrated */}
          <PremiumReveal lockedCount={Math.max(0, total - 2)} t={t} />

          {/* 4. Detailed cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <DetailedPostCard
              post={best}
              tone="best"
              deltaPct={bestDelta}
              t={t}
              language={language}
            />
            <DetailedPostCard
              post={worst}
              tone="worst"
              deltaPct={worstDelta}
              t={t}
              language={language}
            />
          </div>

          {/* 5. Editorial diagnostic */}
          <AiReading aiText={aiInsightText} fallback={aiFallback} t={t} />
        </div>
      ) : (
        <div className="px-5 md:px-6 pb-5 md:pb-6">
          {best && (
            <DetailedPostCard
              post={best}
              tone="best"
              deltaPct={bestDelta}
              t={t}
              language={language}
            />
          )}
        </div>
      )}
    </article>
  );
}

// ─── Comparative Hero ──────────────────────────────────────────────

function ComparativeHero({
  best,
  worst,
  multiplierLabel,
  t,
  language,
}: {
  best: EnrichedPost;
  worst: EnrichedPost;
  multiplierLabel: string;
  t: TR;
  language: SupportedLanguage;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 md:gap-10">
      {/* Best side */}
      <div className="flex flex-col items-start gap-1.5 min-w-0">
        <div className="flex items-center gap-1.5">
          <ArrowUpRight className="size-3 text-accent-primary" aria-hidden="true" />
          <span className="text-eyebrow-sm text-accent-primary">
            {t("posts.hero.best_label")}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="tabular-nums text-[28px] sm:text-[36px] md:text-[48px] font-bold text-content-primary leading-none">
            {formatNumber(best.engagementPct, language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-content-tertiary text-base sm:text-lg font-medium">%</span>
        </div>
        <span className="text-xs text-content-tertiary truncate w-full">
          {best.date} · {formatChipLabel(best.format, t).toLowerCase()}
        </span>
      </div>

      {/* Central medal */}
      <div
        className={cn(
          "flex flex-col items-center justify-center shrink-0",
          "size-16 sm:size-20 md:size-24 rounded-full",
          "bg-surface-muted border border-border-default",
        )}
        aria-hidden="true"
      >
        <span className="tabular-nums text-[18px] sm:text-[22px] md:text-[26px] font-bold text-content-primary leading-none">
          {multiplierLabel || "—"}
        </span>
        <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-content-tertiary mt-1">
          {t("posts.hero.diff_label")}
        </span>
      </div>

      {/* Worst side */}
      <div className="flex flex-col items-end gap-1.5 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-eyebrow-sm text-signal-warning">
            {t("posts.hero.worst_label")}
          </span>
          <ArrowDownRight className="size-3 text-signal-warning" aria-hidden="true" />
        </div>
        <div className="flex items-baseline gap-1">
          <span className="tabular-nums text-[28px] sm:text-[36px] md:text-[48px] font-bold text-content-primary leading-none">
            {formatNumber(worst.engagementPct, language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="text-content-tertiary text-base sm:text-lg font-medium">%</span>
        </div>
        <span className="text-xs text-content-tertiary truncate w-full text-right">
          {worst.date} · {formatChipLabel(worst.format, t).toLowerCase()}
        </span>
      </div>
    </div>
  );
}

// ─── Constellation Scatter ─────────────────────────────────────────

function ConstellationScatter({
  posts,
  best,
  worst,
  avg,
  total,
  t,
  language,
  variant,
}: {
  posts: EnrichedPost[];
  best: EnrichedPost;
  worst: EnrichedPost;
  avg: number;
  total: number;
  t: TR;
  language: SupportedLanguage;
  variant: "sober" | "fog" | "glass";
}) {
  // Layout (viewBox units — scales fluidly).
  const W = 600;
  const H = 180;
  const PAD_L = 64;
  const PAD_R = 24;
  const PAD_T = 28;
  const PAD_B = 28;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  // Parse dates → time scale. Posts may share dates; we add jitter on X
  // for visual separation.
  const points = useMemo(() => {
    const parsed = posts.map((p) => {
      const ts = Date.parse(p.date);
      return { post: p, ts: Number.isFinite(ts) ? ts : 0 };
    });
    const tsValues = parsed.map((p) => p.ts).filter((v) => v > 0);
    const minT = tsValues.length ? Math.min(...tsValues) : 0;
    const maxT = tsValues.length ? Math.max(...tsValues) : 1;
    const engValues = posts.map((p) => p.engagementPct);
    const minE = Math.min(...engValues, 0);
    const maxE = Math.max(...engValues, 0.001);
    const rangeE = maxE - minE || 1;
    const rangeT = maxT - minT || 1;
    return parsed.map(({ post, ts }, i) => {
      const fx = ts > 0 ? (ts - minT) / rangeT : i / Math.max(1, parsed.length - 1);
      // jitter only when many points cluster on same day
      const x = PAD_L + fx * innerW;
      const y = PAD_T + (1 - (post.engagementPct - minE) / rangeE) * innerH;
      return { post, x, y };
    });
  }, [posts, innerW, innerH]);

  const avgY = useMemo(() => {
    const engValues = posts.map((p) => p.engagementPct);
    const minE = Math.min(...engValues, 0);
    const maxE = Math.max(...engValues, 0.001);
    const rangeE = maxE - minE || 1;
    return PAD_T + (1 - (avg - minE) / rangeE) * innerH;
  }, [posts, avg, innerH]);

  const bestPoint = points.find((p) => p.post.id === best.id);
  const worstPoint = points.find((p) => p.post.id === worst.id);

  // X axis ticks — first / middle / last date
  const sortedByTs = useMemo(
    () =>
      [...posts]
        .map((p) => ({ date: p.date, ts: Date.parse(p.date) }))
        .filter((p) => Number.isFinite(p.ts) && p.ts > 0)
        .sort((a, b) => a.ts - b.ts),
    [posts],
  );
  const firstDate = sortedByTs[0]?.date ?? "";
  const lastDate = sortedByTs[sortedByTs.length - 1]?.date ?? "";
  const midDate = sortedByTs[Math.floor(sortedByTs.length / 2)]?.date ?? "";

  const avgFmt = formatNumber(avg, language, { maximumFractionDigits: 2 });
  const bestFmt = formatNumber(best.engagementPct, language, { maximumFractionDigits: 2 });
  const worstFmt = formatNumber(worst.engagementPct, language, { maximumFractionDigits: 2 });

  return (
    <div className="space-y-2">
      <p className="text-eyebrow-sm text-content-tertiary">
        {t("posts.scatter.title", { count: total })}
      </p>
      <div className="rounded-xl border border-border-subtle bg-white p-3 md:p-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto"
          role="img"
          aria-label={t("posts.scatter.aria", {
            count: total,
            best: bestFmt,
            worst: worstFmt,
          })}
        >
          {/* Y axis labels */}
          <text x={4} y={PAD_T + 4} className="fill-content-tertiary" style={{ font: "500 10px Inter, sans-serif", fontVariantNumeric: "tabular-nums" }}>
            {bestFmt}%
          </text>
          <text x={4} y={avgY + 3} className="fill-content-tertiary" style={{ font: "500 10px Inter, sans-serif", fontVariantNumeric: "tabular-nums" }}>
            {avgFmt}%
          </text>
          <text x={4} y={H - PAD_B + 2} className="fill-content-tertiary" style={{ font: "500 10px Inter, sans-serif", fontVariantNumeric: "tabular-nums" }}>
            {worstFmt}%
          </text>

          {/* Average dashed line */}
          <line
            x1={PAD_L}
            y1={avgY}
            x2={W - PAD_R}
            y2={avgY}
            stroke="rgba(3,4,94,0.18)"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
          <text
            x={W - PAD_R - 4}
            y={avgY - 4}
            textAnchor="end"
            className="fill-content-tertiary"
            style={{ font: "500 9px Inter, sans-serif", fontVariantNumeric: "tabular-nums" }}
          >
            {t("posts.scatter.avg_label", { value: avgFmt })}
          </text>

          {/* Non-extreme points */}
          {points.map(({ post, x, y }) => {
            if (post.id === best.id || post.id === worst.id) return null;
            const blur = variant === "fog" ? 0.6 : 0;
            return (
              <circle
                key={post.id}
                cx={x}
                cy={y}
                r={3}
                fill="rgba(3,4,94,0.22)"
                style={blur ? { filter: `blur(${blur}px)` } : undefined}
              >
                <title>{t("posts.scatter.locked_tooltip")}</title>
              </circle>
            );
          })}

          {/* Glass overlay variant */}
          {variant === "glass" && (
            <>
              <rect
                x={PAD_L}
                y={PAD_T}
                width={innerW}
                height={innerH}
                fill="rgba(250,251,253,0.5)"
                style={{ backdropFilter: "blur(2px)" }}
              />
              <circle cx={PAD_L + innerW / 2} cy={PAD_T + innerH / 2} r={14} fill="rgba(255,255,255,0.9)" stroke="rgba(3,4,94,0.2)" />
            </>
          )}

          {/* Best — aura + dot + pill */}
          {bestPoint && (
            <g>
              <circle cx={bestPoint.x} cy={bestPoint.y} r={10} fill="var(--accent-primary, #0077B6)" opacity={0.18} />
              <circle cx={bestPoint.x} cy={bestPoint.y} r={5} fill="var(--accent-primary, #0077B6)" />
              <ScatterPill
                cx={bestPoint.x}
                cy={bestPoint.y - 18}
                label={t("posts.scatter.best_pill", { value: bestFmt })}
                tone="best"
              />
            </g>
          )}

          {/* Worst — aura + dot + pill */}
          {worstPoint && (
            <g>
              <circle cx={worstPoint.x} cy={worstPoint.y} r={10} fill="var(--signal-warning, #BA7517)" opacity={0.18} />
              <circle cx={worstPoint.x} cy={worstPoint.y} r={5} fill="var(--signal-warning, #BA7517)" />
              <ScatterPill
                cx={worstPoint.x}
                cy={worstPoint.y + 18}
                label={t("posts.scatter.worst_pill", { value: worstFmt })}
                tone="worst"
                below
              />
            </g>
          )}

          {/* X axis baseline */}
          <line
            x1={PAD_L}
            y1={H - PAD_B + 6}
            x2={W - PAD_R}
            y2={H - PAD_B + 6}
            stroke="rgba(3,4,94,0.08)"
            strokeWidth={1}
          />

          {/* X axis tick labels */}
          <text x={PAD_L} y={H - 6} className="fill-content-tertiary" style={{ font: "500 10px Inter, sans-serif" }}>
            {firstDate}
          </text>
          <text x={PAD_L + innerW / 2} y={H - 6} textAnchor="middle" className="fill-content-tertiary" style={{ font: "500 10px Inter, sans-serif" }}>
            {midDate}
          </text>
          <text x={W - PAD_R} y={H - 6} textAnchor="end" className="fill-content-tertiary" style={{ font: "500 10px Inter, sans-serif" }}>
            {lastDate}
          </text>
        </svg>

        {/* SR-only data list */}
        <ul className="sr-only">
          {points.map(({ post }) => (
            <li key={post.id}>
              {post.date}: {formatNumber(post.engagementPct, language, { maximumFractionDigits: 2 })}%
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ScatterPill({
  cx,
  cy,
  label,
  tone,
  below = false,
}: {
  cx: number;
  cy: number;
  label: string;
  tone: "best" | "worst";
  below?: boolean;
}) {
  const fill = tone === "best" ? "var(--accent-primary, #0077B6)" : "var(--signal-warning, #BA7517)";
  // Approx text width — keep it simple.
  const padX = 6;
  const charW = 4.6;
  const w = Math.max(40, label.length * charW + padX * 2);
  const h = 14;
  const x = cx - w / 2;
  const y = cy - h / 2;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={7} fill={fill} />
      <text
        x={cx}
        y={cy + 3.5}
        textAnchor="middle"
        fill="#FFFFFF"
        style={{ font: "600 9px Inter, sans-serif", fontVariantNumeric: "tabular-nums" }}
      >
        {label}
      </text>
      {/* small connector */}
      <line
        x1={cx}
        y1={below ? y : y + h}
        x2={cx}
        y2={below ? y - 4 : y + h + 4}
        stroke={fill}
        strokeWidth={1.5}
      />
    </g>
  );
}

// ─── Premium Reveal ────────────────────────────────────────────────

function PremiumReveal({ lockedCount, t }: { lockedCount: number; t: TR }) {
  const { snapshotId, handle, variant } = useReportTracking();
  const [open, setOpen] = useState(false);

  const openInterest = () => {
    trackEvent({
      data: {
        eventType: "unlock_clicked",
        snapshotId: snapshotId ?? undefined,
        handle: handle ?? undefined,
        metadata: {
          variant,
          source_component: "post_comparison_reveal",
        },
      },
    }).catch(() => {});
    setOpen(true);
  };

  return (
    <>
      <div
        className={cn(
          "flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4",
          "rounded-xl border-l-2 border-l-accent-primary border border-border-subtle",
          "bg-accent-primary/[0.06] px-4 py-3.5",
        )}
      >
        <Sparkles className="size-4 text-accent-primary shrink-0" aria-hidden="true" />
        <p className="flex-1 text-sm text-content-primary leading-snug">
          {t("posts.premium.body", { count: lockedCount })}
        </p>
        <button
          type="button"
          onClick={openInterest}
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 rounded-lg",
            "bg-accent-primary text-white px-3.5 py-2",
            "text-sm font-semibold hover:bg-accent-primary/90 transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40",
          )}
        >
          {t("posts.premium.cta")}
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <PremiumInterestDialog
        open={open}
        onOpenChange={setOpen}
        snapshotId={snapshotId}
        handle={handle}
        variant={variant}
        sourceComponent="post_comparison_reveal"
      />
    </>
  );
}

// ─── Detailed Post Card ────────────────────────────────────────────

function DetailedPostCard({
  post,
  tone,
  deltaPct,
  t,
  language,
}: {
  post: EnrichedPost;
  tone: "best" | "worst";
  deltaPct: number;
  t: TR;
  language: SupportedLanguage;
}) {
  const [imgError, setImgError] = useState(false);
  const toneAccent = tone === "best" ? "accent-primary" : "signal-warning";
  const arrowCls = tone === "best" ? "text-accent-primary" : "text-signal-warning";
  const ArrowIcon = tone === "best" ? ArrowUpRight : ArrowDownRight;
  const labelKey = tone === "best" ? "posts.hero.best_label" : "posts.hero.worst_label";

  const thumbUrl = (post as EnrichedPost & { thumbnailUrl?: string }).thumbnailUrl;
  const showImg = thumbUrl && !imgError;

  const deltaRounded = Math.round(deltaPct);
  const deltaSign = deltaRounded > 0 ? "+" : deltaRounded < 0 ? "−" : "";
  const deltaAbs = Math.abs(deltaRounded);
  const deltaLabel = t("posts.vs_avg.value", {
    sign: deltaSign,
    value: deltaAbs,
  });

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl bg-white border border-border-default",
        "border-t-2",
        tone === "best" ? "border-t-accent-primary" : "border-t-signal-warning",
        "shadow-[0_1px_4px_-2px_rgba(0,0,0,0.05)] overflow-hidden",
      )}
    >
      {/* Header strip */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-2">
        <div className="flex items-center gap-1.5">
          <ArrowIcon className={cn("size-3", arrowCls)} aria-hidden="true" />
          <span className={cn("text-eyebrow-sm", arrowCls)}>{t(labelKey)}</span>
        </div>
        <span className="text-xs text-content-tertiary">{post.date}</span>
      </div>

      {/* Body */}
      <div className="flex gap-3 px-3 pb-3">
        {/* Thumb / gradient fallback */}
        <div
          className={cn(
            "relative shrink-0 w-[88px] aspect-square rounded-lg overflow-hidden",
            "border border-border-subtle",
            `bg-gradient-to-br from-${toneAccent}/10 to-${toneAccent}/5`,
          )}
        >
          {showImg ? (
            <img
              src={thumbUrl}
              alt=""
              loading="lazy"
              onError={() => setImgError(true)}
              className="absolute inset-0 size-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <FormatIcon
                format={post.format}
                className={cn("size-9", arrowCls)}
              />
            </div>
          )}
          <span className="absolute top-1 left-1 z-10 text-[7px] font-bold uppercase tracking-[0.04em] px-1.5 py-[2px] rounded bg-white/85 backdrop-blur-sm text-content-primary leading-none shadow-sm">
            {formatChipLabel(post.format, t)}
          </span>
        </div>

        {/* Right: metric + caption */}
        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="tabular-nums text-[22px] font-bold text-content-primary leading-none">
              {formatNumber(post.engagementPct, language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-content-tertiary text-sm font-medium ml-0.5">%</span>
            </span>
            {deltaRounded !== 0 && (
              <span
                className={cn(
                  "inline-flex items-center text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded",
                  tone === "best"
                    ? "bg-accent-primary/10 text-accent-primary"
                    : "bg-signal-warning/10 text-signal-warning",
                )}
              >
                {deltaLabel}
              </span>
            )}
          </div>
          <p className="text-[12px] text-content-primary leading-snug line-clamp-3">
            {post.caption || t("posts.no_caption")}
          </p>
          <div className="flex items-center gap-2.5 mt-auto pt-1.5 border-t border-border-subtle/60">
            <span className="inline-flex items-center gap-1 text-xs text-content-secondary">
              <Heart className="size-3" aria-hidden="true" />
              <span className="tabular-nums">{formatNumber(post.likes, language)}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-content-secondary">
              <MessageCircle className="size-3" aria-hidden="true" />
              <span className="tabular-nums">{formatNumber(post.comments, language)}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AI / Editorial Reading ────────────────────────────────────────

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
    <InsightCallout tone="ai" label={t("posts.callout_label")}>
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

