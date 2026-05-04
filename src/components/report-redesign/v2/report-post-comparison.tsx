import { Heart, MessageCircle, ExternalLink, TrendingUp, TrendingDown, ImageOff } from "lucide-react";
import { useState, type ReactNode } from "react";
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
 * "O que funcionou melhor — e pior"
 * 2 best + 2 worst posts side-by-side, Iconosquare-clean card style.
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <p className="text-eyebrow-sm text-content-secondary">
          MELHORES E PIORES PUBLICAÇÕES
        </p>
        <h3 className="font-sans text-[24px] md:text-[28px] font-bold tracking-tight text-content-primary leading-tight">
          O que funcionou melhor — e pior
        </h3>
        <p className="text-[14px] md:text-[15px] text-content-secondary leading-relaxed max-w-2xl">
          Comparação entre os conteúdos com maior e menor envolvimento
          {windowLabel ? ` nos ${windowLabel}` : " na janela analisada"}.
        </p>
      </div>

      {hasComparison ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {/* Best 2 column */}
          <PostGroup
            label="Melhores 2"
            helper="Conteúdos com maior envolvimento"
            icon={<TrendingUp className="size-4" />}
            accentBg="bg-tint-primary"
            accentText="text-accent-primary"
            accentBorder="border-border-subtle"
            posts={best2}
            rankPrefix="#"
          />
          {/* Worst 2 column */}
          <PostGroup
            label="A melhorar"
            helper="Conteúdos com menor envolvimento"
            icon={<TrendingDown className="size-4" />}
            accentBg="bg-tint-warning"
            accentText="text-signal-warning"
            accentBorder="border-border-subtle"
            posts={worst2}
            rankPrefix="A melhorar #"
          />
        </div>
      ) : (
        /* Fallback: just show best posts if not enough data for comparison */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {best2.map((post, i) => (
            <PostCard key={post.id} post={post} rank={`#${i + 1}`} tone="best" />
          ))}
        </div>
      )}

      {/* AI Insight */}
      <div className="mt-2">{renderInsight()}</div>
    </div>
  );
}

// ─── Post Group ─────────────────────────────────────────────────────

function PostGroup({
  label,
  helper,
  icon,
  accentBg,
  accentText,
  accentBorder,
  posts,
  rankPrefix,
}: {
  label: string;
  helper: string;
  icon: ReactNode;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  posts: EnrichedPost[];
  rankPrefix: string;
}) {
  const tone = rankPrefix === "#" ? "best" : "worst";
  return (
    <div className="space-y-4">
      {/* Group header */}
      <div className={cn("flex items-center gap-2.5 rounded-lg px-3 py-2 border", accentBg, accentBorder)}>
        <span className={cn("shrink-0", accentText)}>{icon}</span>
        <div className="min-w-0">
          <p className={cn("text-[13px] font-semibold leading-snug", accentText)}>
            {label}
          </p>
          <p className="text-[11px] text-content-secondary leading-snug">{helper}</p>
        </div>
      </div>
      {/* Cards */}
      <div className="space-y-3.5">
        {posts.map((post, i) => (
          <PostCard
            key={post.id}
            post={post}
            rank={`${rankPrefix}${i + 1}`}
            tone={tone}
          />
        ))}
      </div>
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
        "group flex gap-4 md:gap-5 rounded-xl border bg-surface-secondary p-4 md:p-5",
        "border-border-default shadow-card",
        "transition-all duration-200",
        permalink && tone === "best" && "hover:border-accent-primary/30 hover:shadow-[0_2px_8px_rgba(37,99,217,0.08)] cursor-pointer",
        permalink && tone === "worst" && "hover:border-signal-warning/30 hover:shadow-[0_2px_8px_rgba(217,119,6,0.06)] cursor-pointer",
      )}
    >
      {/* Thumbnail */}
      <div className="relative shrink-0 w-[110px] md:w-[120px] aspect-square rounded-lg overflow-hidden bg-surface-muted">
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
            <ImageOff className="size-6 text-content-tertiary/40" aria-hidden="true" />
          </div>
        )}
        {/* Format chip */}
        <span className="absolute top-1.5 left-1.5 z-10 text-[9px] font-semibold uppercase tracking-[0.04em] px-1.5 py-0.5 rounded bg-surface-secondary/90 backdrop-blur-sm text-content-primary leading-none shadow-sm">
          {post.format}
        </span>
        {permalink ? (
          <span className="absolute inset-0 z-10 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
            <ExternalLink className="size-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow" />
          </span>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
        {/* Top: date + rank */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-[0.04em] text-content-tertiary font-medium">
            {post.date}
          </span>
          <span
            className={cn(
              "text-[11px] font-semibold px-2.5 py-0.5 rounded-full border leading-none whitespace-nowrap",
              rankChipClasses,
            )}
          >
            {rank}
          </span>
        </div>

        {/* Caption */}
        <p className="text-[13px] md:text-[14px] text-content-primary leading-snug line-clamp-3 font-medium">
          {post.caption || "Sem legenda"}
        </p>

        {/* Metrics */}
        <div className="flex items-center gap-5 pt-2 mt-auto border-t border-border-subtle">
          <span className="inline-flex items-center gap-1.5 text-[12px] text-content-secondary">
            <Heart className="size-3.5" aria-hidden="true" />
            <span className="tabular-nums">{post.likes.toLocaleString("pt-PT")}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-[12px] text-content-secondary">
            <MessageCircle className="size-3.5" aria-hidden="true" />
            <span className="tabular-nums">{post.comments}</span>
          </span>
          <span className={cn(
            "ml-auto text-[13px] font-bold tabular-nums",
            tone === "best" ? "text-accent-primary" : "text-content-tertiary",
          )}>
            {post.engagementPct.toString().replace(".", ",")}%
          </span>
        </div>
      </div>
    </Wrapper>
  );
}