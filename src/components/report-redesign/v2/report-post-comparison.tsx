import { Heart, MessageCircle, ImageOff, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import { cn } from "@/lib/utils";

type EnrichedPost = ReportEnriched["topPosts"][number];

interface PostComparisonBlockProps {
  topPosts: EnrichedPost[];
  bottomPosts: EnrichedPost[];
  renderInsight: () => ReactNode;
  windowLabel?: string;
}

// ─── Label maps ─────────────────────────────────────────────────────

const BEST_LABELS = ["Melhor performance", "Segundo melhor"] as const;
const WORST_LABELS = ["Pior performance", "Segundo pior"] as const;

/** Map internal format to pt-PT chip label */
function formatChipLabel(format: string): string {
  switch (format) {
    case "Carousel":
      return "CARROSSEL";
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
  renderInsight,
  windowLabel,
}: PostComparisonBlockProps) {
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

    let headline = "O formato e a legenda fazem a diferença.";
    if (bestFormat === "Reel" && worstFormat !== "Reel") {
      headline = "Reels superam formatos estáticos nesta conta.";
    } else if (bestFormat === "Carousel" && worstFormat !== "Carousel") {
      headline = "Carrosséis geram mais envolvimento do que posts simples.";
    } else if (bestHasCaption && !worstHasCaption) {
      headline = "Legendas descritivas vencem publicações sem contexto.";
    }

    const body =
      `O conteúdo com melhor desempenho atingiu ${bestEng.toString().replace(".", ",")}% de envolvimento` +
      (multiplierLabel
        ? `, ${multiplierLabel} acima do pior resultado.`
        : ` contra ${worstEng.toString().replace(".", ",")}% do pior.`);

    return { headline, body };
  }, [hasComparison, best2, worst2, bestEng, worstEng, multiplierLabel]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <p className="text-eyebrow-sm text-content-secondary">
          MELHORES E PIORES PUBLICAÇÕES
        </p>
        <h3 className="font-display text-[24px] md:text-[28px] font-bold tracking-tight text-content-primary leading-tight">
          Os extremos do conteúdo
        </h3>
        <p className="text-[14px] md:text-[15px] text-content-secondary leading-relaxed max-w-2xl">
          2 que voaram e 2 que caíram
          {windowLabel ? ` nos ${windowLabel}` : " na janela analisada"}.
          {multiplierLabel
            ? ` ${multiplierLabel} de diferença entre o melhor e o pior.`
            : ""}
        </p>
      </div>

      {hasComparison ? (
        <>
          {/* VS Bar */}
          <VsBar bestEng={bestEng} worstEng={worstEng} />

          {/* Main grid: best | divider | worst */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-0">
            {/* Best column */}
            <div className="space-y-4 md:pr-6">
              {best2.map((post, i) => (
                <div key={post.id} className="space-y-2">
                  <RankRow
                    rank={i + 1}
                    label={BEST_LABELS[i]}
                    tone="best"
                    mirror={false}
                  />
                  <PostCard post={post} tone="best" />
                </div>
              ))}
            </div>

            {/* Central divider — desktop only */}
            <CentralDivider multiplierLabel={multiplierLabel} />

            {/* Mobile-only horizontal difference marker */}
            <MobileDifferenceMarker multiplierLabel={multiplierLabel} />

            {/* Worst column */}
            <div className="space-y-4 md:pl-6">
              {worst2.map((post, i) => (
                <div key={post.id} className="space-y-2">
                  <RankRow
                    rank={i + 1}
                    label={WORST_LABELS[i]}
                    tone="worst"
                    mirror={true}
                  />
                  <PostCard post={post} tone="worst" mirror />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {best2.map((post) => (
            <PostCard key={post.id} post={post} tone="best" />
          ))}
        </div>
      )}

      {/* AI / Editorial reading card */}
      <AiReadingCard fallback={aiFallback}>{renderInsight()}</AiReadingCard>
    </div>
  );
}

// ─── VS Bar ─────────────────────────────────────────────────────────

function VsBar({ bestEng, worstEng }: { bestEng: number; worstEng: number }) {
  const worstBarPct = bestEng > 0 ? Math.max(8, (worstEng / bestEng) * 100) : 50;

  return (
    <div
      className="relative flex items-center justify-between rounded-2xl border border-border-default px-5 py-4 md:px-8 md:py-5 overflow-hidden"
      style={{
        background:
          "linear-gradient(90deg, rgba(37,99,217,0.10) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, rgba(217,119,6,0.10) 100%)",
      }}
    >
      {/* Best side */}
      <div className="flex flex-col items-start gap-1 min-w-[80px] md:min-w-[120px]">
        <div className="flex items-center gap-1.5">
          <TrendingUp className="size-3.5 text-accent-primary" aria-hidden="true" />
          <span className="text-eyebrow-sm text-accent-primary">MELHOR</span>
        </div>
        <span className="font-mono text-[22px] md:text-[26px] font-bold tabular-nums text-accent-primary leading-none">
          {bestEng.toString().replace(".", ",")}%
        </span>
        <div className="w-full h-1.5 rounded-full bg-accent-primary/15 mt-1">
          <div className="h-full rounded-full bg-accent-primary" style={{ width: "100%" }} />
        </div>
      </div>

      {/* VS badge */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="flex items-center justify-center size-11 md:size-12 rounded-full bg-white border-2 border-border-default shadow-md">
          <span className="text-[11px] md:text-[12px] font-bold text-content-primary tracking-wider">
            VS
          </span>
        </div>
      </div>

      {/* Worst side */}
      <div className="flex flex-col items-end gap-1 min-w-[80px] md:min-w-[120px]">
        <div className="flex items-center gap-1.5">
          <span className="text-eyebrow-sm text-signal-warning">PIOR</span>
          <TrendingDown className="size-3.5 text-signal-warning" aria-hidden="true" />
        </div>
        <span className="font-mono text-[22px] md:text-[26px] font-bold tabular-nums text-signal-warning leading-none">
          {worstEng.toString().replace(".", ",")}%
        </span>
        <div className="w-full h-1.5 rounded-full bg-signal-warning/15 mt-1">
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
        "inline-flex items-center justify-center size-6 rounded-full text-[11px] font-bold",
        badgeClasses,
      )}
    >
      {rank}
    </span>
  );
  const labelEl = (
    <span className="text-[13px] font-semibold text-content-primary truncate">
      {label}
    </span>
  );

  if (mirror) {
    return (
      <div className="flex items-center gap-2">
        {labelEl}
        <span className="flex-1" />
        {badge}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {badge}
      {labelEl}
    </div>
  );
}

// ─── Central Divider (desktop) ──────────────────────────────────────

function CentralDivider({ multiplierLabel }: { multiplierLabel: string }) {
  return (
    <div className="hidden md:flex flex-col items-center justify-center gap-3 px-5 min-w-[90px]">
      <div className="w-px flex-1 bg-border-default" />
      {multiplierLabel && (
        <div className="flex flex-col items-center gap-1.5 bg-surface-muted rounded-xl px-3 py-2.5">
          <span className="font-mono text-[24px] font-bold text-content-primary tabular-nums leading-none">
            {multiplierLabel}
          </span>
          <span className="text-eyebrow-sm text-content-tertiary text-center leading-tight max-w-[80px]">
            DIFERENÇA ENTRE EXTREMOS
          </span>
        </div>
      )}
      <div className="w-px flex-1 bg-border-default" />
    </div>
  );
}

// ─── Mobile Difference Marker ───────────────────────────────────────

function MobileDifferenceMarker({
  multiplierLabel,
}: {
  multiplierLabel: string;
}) {
  if (!multiplierLabel) return null;
  return (
    <div className="flex md:hidden items-center gap-3 py-2">
      <div className="h-px flex-1 bg-border-default" />
      <div className="flex items-center gap-2 bg-surface-muted rounded-lg px-3 py-1.5">
        <span className="font-mono text-[16px] font-bold text-content-primary tabular-nums">
          {multiplierLabel}
        </span>
        <span className="text-eyebrow-sm text-content-tertiary">
          DIFERENÇA
        </span>
      </div>
      <div className="h-px flex-1 bg-border-default" />
    </div>
  );
}

// ─── AI Reading Card ────────────────────────────────────────────────

function AiReadingCard({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: { headline: string; body: string } | null;
}) {
  return (
    <div
      className="rounded-2xl border border-border-default p-5 md:p-6 space-y-3 overflow-hidden"
      style={{
        background:
          "linear-gradient(90deg, rgba(37,99,217,0.07) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(217,119,6,0.07) 100%)",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center size-9 rounded-full bg-tint-primary">
          <Sparkles className="size-4 text-accent-primary" />
        </div>
        <span className="text-eyebrow-sm text-content-secondary">
          LEITURA IA · COMPARAÇÃO DE EXTREMOS
        </span>
      </div>
      {/* Render the AI insight if provided */}
      <div>{children}</div>
      {/* Deterministic fallback always shown as supporting context */}
      {fallback && (
        <div className="space-y-2 pt-1">
          <p className="font-display text-[18px] md:text-[20px] font-bold text-content-primary leading-snug">
            {fallback.headline}
          </p>
          <p className="text-[13px] md:text-[14px] text-content-secondary leading-relaxed max-w-3xl">
            {fallback.body}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Post Card ──────────────────────────────────────────────────────

function PostCard({
  post,
  tone,
  mirror = false,
}: {
  post: EnrichedPost;
  tone: "best" | "worst";
  mirror?: boolean;
}) {
  const [imgError, setImgError] = useState(false);

  const topBorderColor =
    tone === "best" ? "border-t-accent-primary" : "border-t-signal-warning";

  const thumbUrl = (post as EnrichedPost & { thumbnailUrl?: string })
    .thumbnailUrl;
  const showImg = thumbUrl && !imgError;

  return (
    <div
      className={cn(
        "flex gap-3 md:gap-4 rounded-2xl border border-t-[3px] bg-white p-3 md:p-4",
        "border-border-default shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)]",
        topBorderColor,
        mirror ? "md:flex-row-reverse" : "",
      )}
    >
      {/* Thumbnail — 3:4 aspect ratio */}
      <div className="relative shrink-0 w-[80px] md:w-[88px] aspect-[3/4] rounded-lg overflow-hidden bg-surface-muted">
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
              className="size-5 text-content-tertiary/40"
              aria-hidden="true"
            />
          </div>
        )}
        {/* Format chip */}
        <span className="absolute top-1.5 left-1.5 z-10 text-[8px] font-semibold uppercase tracking-[0.04em] px-1.5 py-0.5 rounded bg-surface-secondary/90 backdrop-blur-sm text-content-primary leading-none shadow-sm">
          {formatChipLabel(post.format)}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
        {/* Date metadata */}
        <span className="text-[10px] uppercase tracking-[0.04em] text-content-tertiary font-medium">
          {post.date}
        </span>

        {/* Caption */}
        <p className="text-[12px] md:text-[13px] text-content-primary leading-snug line-clamp-2 font-medium">
          {post.caption || "Sem legenda"}
        </p>

        {/* Metrics */}
        <div className="flex items-center gap-3.5 pt-1.5 mt-auto border-t border-border-subtle">
          <span className="inline-flex items-center gap-1 text-[11px] text-content-secondary">
            <Heart className="size-3" aria-hidden="true" />
            <span className="tabular-nums font-mono">
              {post.likes.toLocaleString("pt-PT")}
            </span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-content-secondary">
            <MessageCircle className="size-3" aria-hidden="true" />
            <span className="tabular-nums font-mono">{post.comments}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
