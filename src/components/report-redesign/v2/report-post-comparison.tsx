import { Heart, MessageCircle, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";
import type { ReactNode } from "react";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <p className="text-eyebrow-sm text-slate-500">
          MELHORES E PIORES PUBLICAÇÕES
        </p>
        <h3 className="font-sans text-[22px] md:text-[26px] font-semibold tracking-tight text-slate-900 leading-tight">
          O que funcionou melhor — e pior
        </h3>
        <p className="text-[14px] md:text-[15px] text-slate-500 leading-relaxed max-w-2xl">
          Comparação entre os conteúdos com maior e menor envolvimento
          {windowLabel ? ` nos ${windowLabel}` : " na janela analisada"}.
        </p>
      </div>

      {hasComparison ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          {/* Best 2 column */}
          <PostGroup
            label="Melhores 2"
            helper="Conteúdos com maior envolvimento"
            icon={<TrendingUp className="size-4" />}
            accentBg="bg-emerald-50/60"
            accentText="text-emerald-700"
            accentBorder="border-emerald-200/60"
            posts={best2}
            rankPrefix="#"
          />
          {/* Worst 2 column */}
          <PostGroup
            label="A melhorar"
            helper="Conteúdos com menor envolvimento"
            icon={<TrendingDown className="size-4" />}
            accentBg="bg-amber-50/60"
            accentText="text-amber-700"
            accentBorder="border-amber-200/60"
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
      <div>{renderInsight()}</div>
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
    <div className="space-y-3">
      {/* Group header */}
      <div className={cn("flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 border", accentBg, accentBorder)}>
        <span className={cn("shrink-0", accentText)}>{icon}</span>
        <div className="min-w-0">
          <p className={cn("text-[13px] font-semibold leading-snug", accentText)}>
            {label}
          </p>
          <p className="text-[11px] text-slate-500 leading-snug">{helper}</p>
        </div>
      </div>
      {/* Cards */}
      <div className="space-y-3">
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
      ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
      : "bg-amber-50 text-amber-700 border-amber-200/60";

  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "group flex gap-4 rounded-2xl border border-slate-200/70 bg-white p-3.5",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_-6px_rgba(15,23,42,0.06)]",
        "transition-all duration-200",
        permalink && "hover:border-slate-300 hover:shadow-[0_2px_8px_rgba(15,23,42,0.08)] cursor-pointer",
      )}
    >
      {/* Thumbnail */}
      <div className="relative shrink-0 w-[88px] md:w-[100px] aspect-[4/5] rounded-xl overflow-hidden bg-slate-100">
        {post.permalink ? (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-200 to-slate-300" />
        ) : null}
        {/* Format chip */}
        <span className="absolute top-1.5 right-1.5 z-10 text-[9px] font-semibold uppercase tracking-[0.04em] px-1.5 py-0.5 rounded bg-white/90 backdrop-blur text-slate-700 leading-none">
          {post.format}
        </span>
        {permalink ? (
          <ExternalLink className="absolute bottom-1.5 right-1.5 z-10 size-3 text-white/70 opacity-0 group-hover:opacity-100 transition-opacity" />
        ) : null}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
        {/* Top: date + rank */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-[0.04em] text-slate-400 font-medium">
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
        <p className="text-[13px] md:text-[14px] text-slate-800 leading-snug line-clamp-2 font-medium">
          {post.caption || "Sem legenda"}
        </p>

        {/* Metrics */}
        <div className="flex items-center gap-4 pt-1.5 mt-auto border-t border-slate-100">
          <span className="inline-flex items-center gap-1 text-[12px] text-slate-500">
            <Heart className="size-3.5" aria-hidden="true" />
            <span className="tabular-nums">{post.likes.toLocaleString("pt-PT")}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-[12px] text-slate-500">
            <MessageCircle className="size-3.5" aria-hidden="true" />
            <span className="tabular-nums">{post.comments}</span>
          </span>
          <span className={cn(
            "ml-auto text-[12px] font-semibold tabular-nums",
            tone === "best" ? "text-emerald-600" : "text-amber-600",
          )}>
            {post.engagementPct.toString().replace(".", ",")}%
          </span>
        </div>
      </div>
    </Wrapper>
  );
}