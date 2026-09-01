import {
  Heart,
  MessageCircle,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  GalleryHorizontalEnd,
  Play,
  Image as ImageIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import type { CadenceMethod } from "@/lib/report/cadence";
import { cn } from "@/lib/utils";
import { useTrackOnceInView } from "./use-track-once-in-view";
import { useLanguage } from "@/hooks/use-language";
import { formatNumber } from "@/lib/i18n/format";
import type { SupportedLanguage } from "@/i18n";
import { InsightCallout } from "./overview/insight-callout";
import { usePremiumCta } from "./premium-cta-context";
import { ReportCardSectionHeader } from "./report-card-section-header";

type EnrichedPost = ReportEnriched["topPosts"][number];
type ScatterPost = ReportEnriched["allPostsScatter"][number];
type TR = TFunction<"report", undefined>;

interface PostComparisonBlockProps {
  topPosts: EnrichedPost[];
  bottomPosts: EnrichedPost[];
  /** Todas as publicações da janela, para o scatter de distribuição. */
  allPostsForScatter?: ScatterPost[];
  /** Janela de análise (ISO YYYY-MM-DD) — domínio do eixo X do scatter. */
  windowRange?: { startIso: string; endIso: string };
  /** Raw AI insight text for the comparative diagnostic. */
  aiInsightText?: string | null;
  /**
   * Método de amostra usado no Bloco 1 — determina a copy do subtítulo
   * para evitar implicações falsas de "últimos 30 dias".
   */
  cadenceMethod?: CadenceMethod;
  /** Janela observada em dias (usada apenas quando relevante para copy). */
  cadenceWindowDays?: number;
  /** Nº de publicações da amostra de performance (eligiblePosts). */
  sampleSize?: number;
  /** Variant for the scatter rendering. Default sober. */
  scatterVariant?: "sober" | "fog" | "glass";
}

/**
 * Devolve a chave i18n e os params do subtítulo do bloco "Melhores e piores"
 * em função do método real da amostra. Evita strings hardcoded como
 * "últimos 30 dias" quando a janela observada não é de 30 dias.
 */
export function pickSubtitleKey(
  method: CadenceMethod | undefined,
  count: number,
): { key: string; params?: Record<string, unknown> } {
  if (method === "window_30d") {
    return { key: "posts.subtitle_variants.window_30d" };
  }
  if (method === "window_90d") {
    return { key: "posts.subtitle_variants.window_90d" };
  }
  if (method === "sample_span") {
    if (count === 1) {
      return { key: "posts.subtitle_variants.sample_span_one" };
    }
    return {
      key: "posts.subtitle_variants.sample_span_other",
      params: { count },
    };
  }
  // insufficient ou desconhecido
  return { key: "posts.subtitle_variants.insufficient" };
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
  allPostsForScatter,
  windowRange,
  aiInsightText,
  cadenceMethod,
  cadenceWindowDays: _cadenceWindowDays,
  sampleSize,
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

  // Universe for the scatter: prefer the full scatter dataset (all posts of
  // the window); fall back to topPosts when caller has not wired it yet.
  const scatterPosts: ScatterPost[] = allPostsForScatter && allPostsForScatter.length > 0
    ? allPostsForScatter
    : topPosts.map((p) => ({
        id: p.id,
        format: p.format,
        engagementPct: p.engagementPct,
        date: p.date,
        takenAtIso: p.takenAtIso,
      }));
  const total = scatterPosts.length;
  const avgEng = useMemo(() => {
    if (total === 0) return 0;
    return scatterPosts.reduce((s, p) => s + p.engagementPct, 0) / total;
  }, [scatterPosts, total]);

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
        <ReportCardSectionHeader
          title={t("posts.title")}
          eyebrow={(() => {
            const picked = pickSubtitleKey(cadenceMethod, sampleSize ?? 0);
            return t(picked.key, picked.params);
          })()}
          bottomMargin={false}
        />
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
              posts={scatterPosts}
              best={best}
              worst={worst}
              avg={avgEng}
              total={total}
              t={t}
              language={language}
              variant={scatterVariant}
              windowRange={windowRange}
              bestDelta={bestDelta}
              worstDelta={worstDelta}
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
  windowRange,
  bestDelta,
  worstDelta,
}: {
  posts: ScatterPost[];
  best: EnrichedPost;
  worst: EnrichedPost;
  avg: number;
  total: number;
  t: TR;
  language: SupportedLanguage;
  variant: "sober" | "fog" | "glass";
  windowRange?: { startIso: string; endIso: string };
  bestDelta: number;
  worstDelta: number;
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

  // Time domain: prefer explicit windowRange. Otherwise fall back to
  // min/max of taken_at_iso across posts. Either way the X axis spans the
  // full window so the user sees real density (gaps included).
  const { minT, maxT } = useMemo(() => {
    if (windowRange) {
      const a = Date.parse(`${windowRange.startIso}T00:00:00Z`);
      const b = Date.parse(`${windowRange.endIso}T23:59:59Z`);
      if (Number.isFinite(a) && Number.isFinite(b) && b > a) return { minT: a, maxT: b };
    }
    const tsValues = posts
      .map((p) => (p.takenAtIso ? Date.parse(p.takenAtIso) : NaN))
      .filter((v) => Number.isFinite(v)) as number[];
    if (tsValues.length === 0) return { minT: 0, maxT: 1 };
    return { minT: Math.min(...tsValues), maxT: Math.max(...tsValues) };
  }, [posts, windowRange]);

  const points = useMemo(() => {
    const engValues = posts.map((p) => p.engagementPct);
    const minE = Math.min(...engValues, 0);
    const maxE = Math.max(...engValues, 0.001);
    const rangeE = maxE - minE || 1;
    const rangeT = maxT - minT || 1;
    return posts.map((post, i) => {
      const ts = post.takenAtIso ? Date.parse(post.takenAtIso) : NaN;
      const fx = Number.isFinite(ts)
        ? (ts - minT) / rangeT
        : i / Math.max(1, posts.length - 1);
      const x = PAD_L + Math.min(1, Math.max(0, fx)) * innerW;
      const y = PAD_T + (1 - (post.engagementPct - minE) / rangeE) * innerH;
      return { post, x, y };
    });
  }, [posts, minT, maxT, innerW, innerH]);

  const avgY = useMemo(() => {
    const engValues = posts.map((p) => p.engagementPct);
    const minE = Math.min(...engValues, 0);
    const maxE = Math.max(...engValues, 0.001);
    const rangeE = maxE - minE || 1;
    return PAD_T + (1 - (avg - minE) / rangeE) * innerH;
  }, [posts, avg, innerH]);

  const bestPoint = points.find((p) => p.post.id === best.id);
  const worstPoint = points.find((p) => p.post.id === worst.id);

  // X axis tick labels: start / midpoint / end of the visible window.
  const fmtTick = (ts: number): string => {
    if (!Number.isFinite(ts)) return "";
    const d = new Date(ts);
    const day = String(d.getUTCDate()).padStart(2, "0");
    const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    return `${day} ${months[d.getUTCMonth()]}`;
  };
  const firstDate = fmtTick(minT);
  const lastDate = fmtTick(maxT);
  const midDate = fmtTick(minT + (maxT - minT) / 2);

  const avgFmt = formatNumber(avg, language, { maximumFractionDigits: 2 });
  const bestFmt = formatNumber(best.engagementPct, language, { maximumFractionDigits: 2 });
  const worstFmt = formatNumber(worst.engagementPct, language, { maximumFractionDigits: 2 });

  // Tooltip state — works for both hover (desktop) and tap (mobile).
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Click-outside / tap-outside to dismiss tooltip.
  useEffect(() => {
    if (!hoveredId) return;
    const onDocPointer = (e: PointerEvent) => {
      const el = containerRef.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setHoveredId(null);
      }
    };
    document.addEventListener("pointerdown", onDocPointer);
    return () => document.removeEventListener("pointerdown", onDocPointer);
  }, [hoveredId]);

  const fmtDelta = (delta: number) => {
    const rounded = Math.round(delta);
    const sign = rounded > 0 ? "+" : rounded < 0 ? "−" : "";
    return t("posts.scatter.tooltip_delta", { sign, value: Math.abs(rounded) });
  };

  const hoveredPoint = hoveredId ? points.find((p) => p.post.id === hoveredId) : null;
  const hoveredIsBest = hoveredId === best.id;
  const hoveredIsWorst = hoveredId === worst.id;
  const hoveredIsExtreme = hoveredIsBest || hoveredIsWorst;

  // Convert viewBox coords to percentage so the overlay div tracks the SVG
  // regardless of rendered width (viewBox preserves aspect ratio).
  const toLeftPct = (x: number) => `${(x / W) * 100}%`;
  const toTopPct = (y: number) => `${(y / H) * 100}%`;

  return (
    <div className="space-y-2">
      <p className="text-eyebrow-sm text-content-tertiary">
        {t("posts.scatter.title", { count: total })}
        <span className="text-content-tertiary/70 normal-case font-normal tracking-normal"> · {t("posts.scatter.hint")}</span>
      </p>
      <div ref={containerRef} className="relative rounded-xl border border-border-subtle bg-white p-3 md:p-4">
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

          {/* Non-extreme (locked) points */}
          {points.map(({ post, x, y }) => {
            if (post.id === best.id || post.id === worst.id) return null;
            const blur = variant === "fog" ? 0.6 : 0;
            const isHovered = hoveredId === post.id;
            return (
              <g key={post.id}>
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 4 : 3}
                  fill={isHovered ? "rgba(3,4,94,0.45)" : "rgba(3,4,94,0.22)"}
                  style={blur ? { filter: `blur(${blur}px)` } : undefined}
                />
                {/* generous transparent hit target */}
                <circle
                  cx={x}
                  cy={y}
                  r={12}
                  fill="transparent"
                  className="cursor-pointer focus:outline-none"
                  tabIndex={0}
                  role="button"
                  aria-label={t("posts.scatter.locked_tooltip")}
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse") setHoveredId(post.id);
                  }}
                  onPointerLeave={(e) => {
                    if (e.pointerType === "mouse") setHoveredId((cur) => (cur === post.id ? null : cur));
                  }}
                  onClick={() => setHoveredId((cur) => (cur === post.id ? null : post.id))}
                  onFocus={() => setHoveredId(post.id)}
                  onBlur={() => setHoveredId((cur) => (cur === post.id ? null : cur))}
                />
              </g>
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

          {/* Best — aura + dot + discrete ★ marker (no number) */}
          {bestPoint && (
            <ExtremeMarker
              cx={bestPoint.x}
              cy={bestPoint.y}
              tone="best"
              label={t("posts.scatter.best_marker")}
              postId={best.id}
              hovered={hoveredId === best.id}
              setHovered={setHoveredId}
            />
          )}

          {/* Worst — aura + dot + discrete ▾ marker (no number) */}
          {worstPoint && (
            <ExtremeMarker
              cx={worstPoint.x}
              cy={worstPoint.y}
              tone="worst"
              label={t("posts.scatter.worst_marker")}
              postId={worst.id}
              hovered={hoveredId === worst.id}
              setHovered={setHoveredId}
              below
            />
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

        {/* Floating tooltip overlay — positioned over the SVG using percentages */}
        {hoveredPoint && (
          <ScatterTooltip
            leftPct={toLeftPct(hoveredPoint.x)}
            topPct={toTopPct(hoveredPoint.y)}
            anchorX={hoveredPoint.x}
            viewW={W}
            variant={
              hoveredIsExtreme ? (hoveredIsBest ? "best" : "worst") : "locked"
            }
            post={hoveredIsBest ? best : hoveredIsWorst ? worst : null}
            delta={hoveredIsBest ? bestDelta : hoveredIsWorst ? worstDelta : 0}
            language={language}
            t={t}
            fmtDelta={fmtDelta}
          />
        )}

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

function ExtremeMarker({
  cx,
  cy,
  tone,
  label,
  postId,
  hovered,
  setHovered,
  below = false,
}: {
  cx: number;
  cy: number;
  tone: "best" | "worst";
  label: string;
  postId: string;
  hovered: boolean;
  setHovered: (id: string | null | ((cur: string | null) => string | null)) => void;
  below?: boolean;
}) {
  const fill =
    tone === "best"
      ? "var(--accent-primary, #0077B6)"
      : "var(--content-tertiary, #6B7280)";
  // Pill geometry — sized for ~10px Inter SemiBold uppercase label.
  const pillW = 46;
  const pillH = 16;
  const pillGap = below ? 14 : -14 - pillH;
  const pillY = cy + pillGap;
  const pillX = cx - pillW / 2;
  const labelY = pillY + pillH / 2 + 3.5;
  return (
    <g>
      {/* Aura — softer */}
      <circle cx={cx} cy={cy} r={hovered ? 12 : 10} fill={fill} opacity={hovered ? 0.22 : 0.14} />
      {/* Main point */}
      <circle cx={cx} cy={cy} r={6} fill={fill} />
      <circle cx={cx} cy={cy} r={6} fill="none" stroke="#FFFFFF" strokeWidth={1.5} />
      {/* Editorial pill label */}
      <rect
        x={pillX}
        y={pillY}
        width={pillW}
        height={pillH}
        rx={pillH / 2}
        ry={pillH / 2}
        fill="rgba(255,255,255,0.92)"
        stroke={fill}
        strokeWidth={1}
      />
      <text
        x={cx}
        y={labelY}
        textAnchor="middle"
        fill={fill}
        style={{
          font: "600 9.5px Inter, sans-serif",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </text>
      {/* Generous hit target */}
      <circle
        cx={cx}
        cy={cy}
        r={16}
        fill="transparent"
        className="cursor-pointer focus:outline-none"
        tabIndex={0}
        role="button"
        aria-label={label}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") setHovered(postId);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setHovered((cur) => (cur === postId ? null : cur));
        }}
        onClick={() => setHovered((cur) => (cur === postId ? null : postId))}
        onFocus={() => setHovered(postId)}
        onBlur={() => setHovered((cur) => (cur === postId ? null : cur))}
      />
    </g>
  );
}

function ScatterTooltip({
  leftPct,
  topPct,
  anchorX,
  viewW,
  variant,
  post,
  delta,
  language,
  t,
  fmtDelta,
}: {
  leftPct: string;
  topPct: string;
  anchorX: number;
  viewW: number;
  variant: "best" | "worst" | "locked";
  post: EnrichedPost | null;
  delta: number;
  language: SupportedLanguage;
  t: TR;
  fmtDelta: (d: number) => string;
}) {
  // Auto-flip horizontally near edges.
  const xPct = anchorX / viewW;
  const translateX = xPct < 0.25 ? "0%" : xPct > 0.75 ? "-100%" : "-50%";

  if (variant === "locked") {
    return (
      <div
        role="tooltip"
        className="pointer-events-none absolute z-20 -translate-y-[calc(100%+8px)] rounded-lg border border-border-subtle bg-white px-3 py-2 shadow-lg max-w-[min(220px,calc(100vw-2rem))]"
        style={{ left: leftPct, top: topPct, transform: `translate(${translateX}, calc(-100% - 8px))` }}
      >
        <p className="text-xs text-content-secondary leading-snug">
          {t("posts.scatter.locked_tooltip")}
        </p>
      </div>
    );
  }

  if (!post) return null;

  const isBest = variant === "best";
  const toneCls = isBest ? "text-accent-primary" : "text-signal-warning";
  const borderCls = isBest ? "border-l-accent-primary" : "border-l-signal-warning";
  const captionExcerpt = (post.caption ?? "").trim().slice(0, 90);
  const captionDisplay = captionExcerpt.length === 90 ? `${captionExcerpt}…` : captionExcerpt;

  // Position: above for best, below for worst (matches marker side).
  const verticalTransform = isBest ? "calc(-100% - 14px)" : "14px";

  return (
    <div
      role="tooltip"
      className={cn(
        "pointer-events-none absolute z-20 rounded-lg bg-white shadow-lg border border-border-default border-l-2",
        borderCls,
        "px-3 py-2.5 w-[240px] max-w-[calc(100vw-2rem)]",
      )}
      style={{ left: leftPct, top: topPct, transform: `translate(${translateX}, ${verticalTransform})` }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className={cn("text-eyebrow-sm", toneCls)}>
          {t(isBest ? "posts.hero.best_label" : "posts.hero.worst_label")}
        </span>
        <span className="text-[10px] text-content-tertiary">{post.date}</span>
      </div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="tabular-nums text-base font-bold text-content-primary leading-none">
          {formatNumber(post.engagementPct, language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
        </span>
        <span className={cn("text-[10px] font-semibold tabular-nums", toneCls)}>
          {fmtDelta(delta)}
        </span>
        <span className="text-[10px] text-content-tertiary ml-auto">
          {formatChipLabel(post.format, t).toLowerCase()}
        </span>
      </div>
      {captionDisplay && (
        <p className="text-[11px] text-content-secondary leading-snug line-clamp-2 mb-1.5">
          {captionDisplay}
        </p>
      )}
      <div className="flex items-center gap-2.5 pt-1.5 border-t border-border-subtle/60">
        <span className="inline-flex items-center gap-1 text-[10px] text-content-secondary">
          <Heart className="size-2.5" aria-hidden="true" />
          <span className="tabular-nums">{formatNumber(post.likes, language)}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] text-content-secondary">
          <MessageCircle className="size-2.5" aria-hidden="true" />
          <span className="tabular-nums">{formatNumber(post.comments, language)}</span>
        </span>
      </div>
    </div>
  );
}

// ─── Premium Reveal ────────────────────────────────────────────────

function PremiumReveal({ lockedCount, t }: { lockedCount: number; t: TR }) {
  const { handlePremiumAccessClick } = usePremiumCta();

  const openInterest = () => {
    handlePremiumAccessClick("premium_section");
  };

  return (
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

  const toneSoftBg = tone === "best" ? "bg-accent-primary/[0.08]" : "bg-signal-warning/[0.08]";
  const toneGradient =
    tone === "best"
      ? "bg-gradient-to-r from-accent-primary/40 via-accent-primary/15 to-transparent"
      : "bg-gradient-to-r from-signal-warning/40 via-signal-warning/15 to-transparent";
  const formatLabel = formatChipLabel(post.format, t);
  const engagementPctFmt = formatNumber(post.engagementPct, language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div
      className={cn(
        "group flex flex-col rounded-xl bg-white border border-border-default",
        "shadow-[0_1px_4px_-2px_rgba(0,0,0,0.05)] overflow-hidden",
        "transition-shadow hover:shadow-md",
      )}
    >
      {/* Tonal gradient strip — substitutes the flat colored top border */}
      <div className={cn("h-1 w-full", toneGradient)} aria-hidden="true" />

      {/* Header strip */}
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2.5">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5",
            toneSoftBg,
          )}
        >
          <ArrowIcon className={cn("size-3", arrowCls)} aria-hidden="true" />
          <span className={cn("text-eyebrow-sm", arrowCls)}>{t(labelKey)}</span>
        </span>
        <span className="text-xs text-content-tertiary tabular-nums">{post.date}</span>
      </div>

      {/* Body */}
      <div className="flex gap-3.5 px-3 pb-3">
        {/* Thumb / gradient fallback */}
        <div
          className={cn(
            "relative shrink-0 w-[120px] sm:w-[132px] aspect-[4/5] rounded-lg overflow-hidden",
            "border border-border-subtle bg-surface-muted",
          )}
        >
          {/* Base fallback — always rendered behind the image so a slow
              network or a transparent thumbnail still shows the icon. */}
          <div className="absolute inset-0 flex items-center justify-center text-content-tertiary">
            <FormatIcon
              format={post.format}
              className="size-10 opacity-60"
            />
          </div>
          {/* Real thumbnail — sits on top when available. IG CDN URLs can
              expire or 403 — onError hides the <img> and the fallback icon
              above shows through. referrerPolicy=no-referrer reduces 403s
              from CDNs that reject requests carrying a referer header. */}
          {showImg && (
            <img
              src={thumbUrl}
              alt={t("posts.thumb_alt", { format: formatLabel.toLowerCase(), date: post.date })}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          )}
          {/* Format chip — navy translucent capsule, top-left */}
          <span
            className={cn(
              "absolute top-1.5 left-1.5 z-10 inline-flex items-center gap-1",
              "rounded-full px-1.5 py-[3px]",
              "bg-content-primary/85 text-white backdrop-blur-sm",
              "text-[9px] font-semibold uppercase tracking-[0.06em] leading-none",
              "shadow-sm",
            )}
          >
            <FormatIcon format={post.format} className="size-2.5" />
            {formatLabel}
          </span>
        </div>

        {/* Right: metric + caption */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Primary metric — engagement rate of this very post */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="tabular-nums text-lg font-semibold text-content-primary leading-none">
              {engagementPctFmt}
              <span className="text-content-tertiary text-sm font-medium ml-0.5">%</span>
            </span>
            {deltaRounded !== 0 && (
              <span
                className={cn(
                  "inline-flex items-center text-[11px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full",
                  tone === "best"
                    ? "bg-accent-primary/10 text-accent-primary"
                    : "bg-signal-warning/10 text-signal-warning",
                )}
              >
                {deltaLabel}
              </span>
            )}
          </div>
          {post.caption ? (
            <p className="text-[13px] text-content-primary leading-[1.45] line-clamp-3">
              {post.caption}
            </p>
          ) : (
            <p className="text-[13px] italic text-content-tertiary leading-[1.45]">
              {t("posts.no_caption")}
            </p>
          )}
          <div className="flex items-center gap-3 mt-auto pt-2 border-t border-border-subtle/60">
            <span className="inline-flex items-center gap-1 text-sm text-content-secondary">
              <Heart className="size-3.5" aria-hidden="true" />
              <span className="tabular-nums">{formatNumber(post.likes, language)}</span>
            </span>
            <span className="inline-flex items-center gap-1 text-sm text-content-secondary">
              <MessageCircle className="size-3.5" aria-hidden="true" />
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


/**
 * PostComparisonPreview — apresentação derivada do MESMO subconjunto de
 * dados do `PostComparisonBlock`, para o Estado A (auditoria instantânea
 * sem email). Não recalcula nada: recebe os mesmos `topPosts`/`bottomPosts`
 * e renderiza apenas o que é seguro mostrar antes da captura de email
 * (thumbnail, etiqueta melhor/pior, formato, data, legenda truncada).
 *
 * Os valores analíticos (engagement, likes, comentários, multiplicador,
 * scatter e leitura editorial) NÃO são renderizados — não há camada de CSS
 * por cima de conteúdo completo.
 */
export function PostComparisonPreview({
  topPosts,
  bottomPosts,
  cadenceMethod,
  sampleSize,
  gate,
}: {
  topPosts: EnrichedPost[];
  bottomPosts: EnrichedPost[];
  cadenceMethod?: CadenceMethod;
  sampleSize?: number;
  /** Gate gratuito composto como continuação do preview (Estado A). */
  gate?: React.ReactNode;
}) {
  const { t } = useTranslation("report");
  // Estado A: um único evento de visualização; o convite vive no gate.
  const previewRef = useTrackOnceInView<HTMLElement>(
    "post_comparison_preview_viewed",
    true,
    {},
  );
  const best = topPosts[0];
  const worst = bottomPosts[bottomPosts.length - 1];
  if (!best) return null;

  const items: Array<{ post: EnrichedPost; label: string; tone: "best" | "worst" }> = [
    { post: best, label: t("posts.best_label", { defaultValue: "Melhor publicação" }), tone: "best" },
  ];
  if (worst && worst.id !== best.id) {
    items.push({
      post: worst,
      label: t("posts.worst_label", { defaultValue: "Pior publicação" }),
      tone: "worst",
    });
  }

  /** Rótulos nítidos, valores por revelar. Nenhum dado real no DOM. */
  const protectedMetrics = ["Envolvimento", "Interacções", "vs. média"];

  const shownIds = new Set(items.map((i) => i.post.id));
  const morePosts = [...topPosts, ...bottomPosts].filter(
    (p) => !shownIds.has(p.id),
  );
  const remaining = Math.max(0, (sampleSize ?? 0) - items.length);

  return (
    <article
      ref={previewRef}
      className="rounded-2xl border border-border-default bg-surface-secondary shadow-card overflow-hidden"
    >
      <div className="px-5 md:px-6 pt-6 md:pt-8 pb-4 space-y-3">
        <ReportCardSectionHeader
          title={t("posts.title")}
          eyebrow={(() => {
            const picked = pickSubtitleKey(cadenceMethod, sampleSize ?? 0);
            return t(picked.key, picked.params);
          })()}
          bottomMargin={false}
        />
        <span className="text-eyebrow-sm inline-flex items-center rounded-full border border-accent-primary/25 bg-accent-primary/8 px-2.5 py-1 text-accent-primary">
          Grátis com email
        </span>
      </div>

      <div className="px-5 md:px-6 pb-6 md:pb-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map(({ post, label, tone }) => (
            <div
              key={post.id}
              className="rounded-xl border border-border-default bg-surface-base overflow-hidden"
            >
              <div className="relative">
                <PreviewThumb post={post} />
                <span
                  className={cn(
                    "absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1",
                    "text-eyebrow-sm bg-surface-base/90 backdrop-blur-sm border border-border-subtle",
                    tone === "best" ? "text-signal-positive" : "text-signal-warning",
                  )}
                >
                  {tone === "best" ? (
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  ) : (
                    <ArrowDownRight className="size-3.5" aria-hidden="true" />
                  )}
                  {label}
                </span>
              </div>

              <div className="p-3">
                <p className="flex items-center gap-1.5 text-xs text-content-tertiary">
                  <FormatIcon format={post.format} className="size-3.5" />
                  <span>{formatChipLabel(post.format, t)}</span>
                  {post.date ? <span aria-hidden="true">·</span> : null}
                  {post.date ? <span>{post.date}</span> : null}
                </p>
                <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-content-secondary">
                  {post.caption || "—"}
                </p>
              </div>
              {/* Faixa protegida: rótulos legíveis, valores por revelar.
                  Os valores são glifos neutros — nenhum dado sanitizado
                  chega ao DOM. */}
              <div className="relative border-t border-border-default bg-surface-muted/50 px-3 py-2.5">
                <div className="grid grid-cols-3 gap-2">
                  {protectedMetrics.map((metric) => (
                    <div key={metric} className="min-w-0">
                      <p className="text-eyebrow-sm truncate text-content-tertiary">
                        {metric}
                      </p>
                      <p
                        aria-hidden="true"
                        className="mt-1 select-none text-sm font-semibold text-content-primary/70 blur-[2.5px]"
                      >
                        ••••
                      </p>
                    </div>
                  ))}
                </div>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-surface-base/35"
                />
              </div>
            </div>
          ))}
        </div>

        {morePosts.length > 0 || remaining > 0 ? (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-border-default bg-surface-base px-3 py-2.5">
            <div className="flex -space-x-2" aria-hidden="true">
              {morePosts.slice(0, 5).map((p) => (
                <MorePreviewThumb key={p.id} post={p} />
              ))}
            </div>
            {remaining > 0 ? (
              <p className="min-w-0 text-xs text-content-tertiary">
                {`+${remaining} publicações analisadas nesta janela`}
              </p>
            ) : null}
          </div>
        ) : null}

        {gate ? (
          <div className="mt-5 border-t border-border-default pt-5">
            <p className="mb-3 text-sm text-content-secondary">
              {sampleSize
                ? `Análise completa das ${sampleSize} publicações, dos formatos e das conversas.`
                : "Análise completa das publicações, dos formatos e das conversas."}
            </p>
            {gate}
          </div>
        ) : null}
      </div>
    </article>
  );
}



/**
 * Miniatura do preview gratuito. Quando não existe imagem (ou o URL do CDN
 * do Instagram já expirou), mostra o ícone de formato em vez de um espaço
 * partido. Nunca inventa imagem.
 */
function PreviewThumb({
  post,
}: {
  post: EnrichedPost & { thumbnailUrl?: string };
}) {
  const [imgError, setImgError] = useState(false);
  const url = post.thumbnailUrl;
  const show = Boolean(url) && !imgError;
  return (
    <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-border-subtle bg-surface-muted">
      <div className="absolute inset-0 flex items-center justify-center text-content-tertiary">
        <FormatIcon format={post.format} className="size-6 opacity-60" />
      </div>
      {show ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
    </div>
  );
}
