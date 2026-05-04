import { Heart, MessageCircle, ExternalLink, TrendingUp, TrendingDown, ImageOff, Sparkles } from "lucide-react";
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

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="space-y-1.5">
        <p className="text-eyebrow-sm text-content-secondary">
          MELHORES E PIORES PUBLICAÇÕES
        </p>
        <h3 className="font-sans text-[24px] md:text-[28px] font-bold tracking-tight text-content-primary leading-tight">
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
          {/* ── VS Bar ─────────────────────────────────── */}
          <VsBar bestEng={bestEng} worstEng={worstEng} />

          {/* ── Main grid: best | divider | worst ──────── */}
          {/* Desktop: 3 columns. Mobile: stacked. */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-0">
            {/* Best column */}
            <div className="space-y-3 md:pr-6">
              <ColumnHeader
                label="Melhores 2"
                helper="Maior envolvimento"
                icon={<TrendingUp className="size-3.5" />}
                tone="best"
              />
              {best2.map((post, i) => (
                <PostCard key={post.id} post={post} rank={`#${i + 1}`} tone="best" />
              ))}
            </div>

            {/* Central divider — hidden on mobile */}
            <CentralDivider multiplierLabel={multiplierLabel} />

            {/* Worst column */}
            <div className="space-y-3 md:pl-6">
              <ColumnHeader
                label="A melhorar"
                helper="Menor envolvimento"
                icon={<TrendingDown className="size-3.5" />}
                tone="worst"
              />
              {worst2.map((post, i) => (
                <PostCard key={post.id} post={post} rank={`#${i + 1}`} tone="worst" />
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {best2.map((post, i) => (
            <PostCard key={post.id} post={post} rank={`#${i + 1}`} tone="best" />
          ))}
        </div>
      )}

      {/* ── AI / Editorial reading card ────────────────── */}
      <AiReadingCard>{renderInsight()}</AiReadingCard>
    </div>
  );
}

// ─── VS Bar ─────────────────────────────────────────────────────────

function VsBar({ bestEng, worstEng }: { bestEng: number; worstEng: number }) {
  return (
    <div
      className="relative flex items-center justify-between rounded-xl border border-border-default px-4 py-3 md:px-6 md:py-3.5 overflow-hidden"
      style={{
        background:
          "linear-gradient(90deg, rgba(37,99,217,0.06) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(217,119,6,0.06) 100%)",
      }}
    >
      {/* Best value */}
      <div className="flex items-center gap-2">
        <TrendingUp className="size-4 text-accent-primary" />
        <span className="font-mono text-[18px] md:text-[22px] font-bold tabular-nums text-accent-primary">
          {bestEng.toString().replace(".", ",")}%
        </span>
      </div>

      {/* VS badge */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="flex items-center justify-center size-9 md:size-10 rounded-full bg-surface-secondary border-2 border-border-default shadow-sm">
          <span className="text-[11px] md:text-[12px] font-bold text-content-secondary tracking-wide">
            VS
          </span>
        </div>
      </div>

      {/* Worst value */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[18px] md:text-[22px] font-bold tabular-nums text-signal-warning">
          {worstEng.toString().replace(".", ",")}%
        </span>
        <TrendingDown className="size-4 text-signal-warning" />
      </div>
    </div>
  );
}

// ─── Column Header ──────────────────────────────────────────────────

function ColumnHeader({
  label,
  helper,
  icon,
  tone,
}: {
  label: string;
  helper: string;
  icon: ReactNode;
  tone: "best" | "worst";
}) {
  const accent = tone === "best" ? "text-accent-primary" : "text-signal-warning";
  const bg = tone === "best" ? "bg-tint-primary" : "bg-tint-warning";
  return (
    <div className={cn("flex items-center gap-2 rounded-lg px-3 py-2 border border-border-subtle", bg)}>
      <span className={cn("shrink-0", accent)}>{icon}</span>
      <div className="min-w-0">
        <p className={cn("text-[13px] font-semibold leading-snug", accent)}>{label}</p>
        <p className="text-[11px] text-content-secondary leading-snug">{helper}</p>
      </div>
    </div>
  );
}

// ─── Central Divider ────────────────────────────────────────────────

function CentralDivider({ multiplierLabel }: { multiplierLabel: string }) {
  return (
    <div className="hidden md:flex flex-col items-center justify-center gap-3 px-4 min-w-[80px]">
      <div className="w-px flex-1 bg-border-default" />
      {multiplierLabel && (
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-[20px] font-bold text-content-primary tabular-nums">
            {multiplierLabel}
          </span>
          <span className="text-eyebrow-sm text-content-tertiary text-center leading-tight max-w-[70px]">
            DIFERENÇA ENTRE EXTREMOS
          </span>
        </div>
      )}
      <div className="w-px flex-1 bg-border-default" />
    </div>
  );
}

// ─── AI Reading Card ────────────────────────────────────────────────

function AiReadingCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-xl border border-border-default p-5 md:p-6 space-y-3 overflow-hidden"
      style={{
        background:
          "linear-gradient(90deg, rgba(37,99,217,0.04) 0%, rgba(255,255,255,0) 45%, rgba(255,255,255,0) 55%, rgba(217,119,6,0.04) 100%)",
      }}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-accent-primary" />
        <span className="text-eyebrow-sm text-content-secondary">
          LEITURA IA · COMPARAÇÃO DE EXTREMOS
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}

// ─── Post Card ──────────────────────────────────────────────────────

function PostCard({
  post,
  rank,
  tone,
}: {
  post: EnrichedPost;
  rank: string;
  tone: "best" | "worst";
}) {
  const [imgError, setImgError] = useState(false);
  const permalink = post.permalink;
  const Wrapper = permalink ? "a" : "div";
  const wrapperProps = permalink
    ? {
        href: permalink,
        target: "_blank" as const,
        rel: "noopener noreferrer",
        "aria-label": `Abrir publicação: ${post.caption.slice(0, 60)}`,
      }
    : {};

  const rankChipClasses =
    tone === "best"
      ? "bg-tint-primary text-accent-primary border-border-subtle"
      : "bg-tint-warning text-signal-warning border-border-subtle";

  const thumbUrl = (post as EnrichedPost & { thumbnailUrl?: string }).thumbnailUrl;
  const showImg = thumbUrl && !imgError;

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "group flex gap-3 md:gap-4 rounded-xl border bg-surface-secondary p-3 md:p-4",
        "border-border-default shadow-card",
        "transition-all duration-200",
        permalink && tone === "best" && "hover:border-accent-primary/30 hover:shadow-[0_2px_8px_rgba(37,99,217,0.08)] cursor-pointer",
        permalink && tone === "worst" && "hover:border-signal-warning/30 hover:shadow-[0_2px_8px_rgba(217,119,6,0.06)] cursor-pointer",
      )}
    >
      {/* Thumbnail — 3:4 aspect ratio */}
      <div className="relative shrink-0 w-[80px] md:w-[100px] aspect-[3/4] rounded-lg overflow-hidden bg-surface-muted">
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
            <ImageOff className="size-5 text-content-tertiary/40" aria-hidden="true" />
          </div>
        )}
        {/* Format chip */}
        <span className="absolute top-1.5 left-1.5 z-10 text-[9px] font-semibold uppercase tracking-[0.04em] px-1.5 py-0.5 rounded bg-surface-secondary/90 backdrop-blur-sm text-content-primary leading-none shadow-sm">
          {post.format}
        </span>
        {permalink ? (
          <span className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
            <ExternalLink className="size-3.5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow" />
          </span>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
        {/* Top: date + rank */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-[0.04em] text-content-tertiary font-medium">
            {post.date}
          </span>
          <span
            className={cn(
              "text-[10px] font-semibold px-2 py-0.5 rounded-full border leading-none whitespace-nowrap",
              rankChipClasses,
            )}
          >
            {rank}
          </span>
        </div>

        {/* Caption */}
        <p className="text-[12px] md:text-[13px] text-content-primary leading-snug line-clamp-2 font-medium">
          {post.caption || "Sem legenda"}
        </p>

        {/* Metrics */}
        <div className="flex items-center gap-4 pt-1.5 mt-auto border-t border-border-subtle">
          <span className="inline-flex items-center gap-1 text-[11px] text-content-secondary">
            <Heart className="size-3" aria-hidden="true" />
            <span className="tabular-nums">{post.likes.toLocaleString("pt-PT")}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-content-secondary">
            <MessageCircle className="size-3" aria-hidden="true" />
            <span className="tabular-nums">{post.comments}</span>
          </span>
          <span className={cn(
            "ml-auto text-[12px] font-bold tabular-nums",
            tone === "best" ? "text-accent-primary" : "text-content-tertiary",
          )}>
            {post.engagementPct.toString().replace(".", ",")}%
          </span>
        </div>
      </div>
    </Wrapper>
  );
}