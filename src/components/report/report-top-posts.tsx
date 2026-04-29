import { Heart, MessageCircle, ExternalLink } from "lucide-react";
import { ReportSection } from "./report-section";
import { useReportData } from "./report-data-context";
import { cn } from "@/lib/utils";

export function ReportTopPosts() {
  const reportData = useReportData();
  const windowLabel = reportData.meta?.windowLabel ?? "últimos 30 dias";
  const subtitle =
    reportData.meta?.topPostsSubtitle ??
    `Ordenadas pelo envolvimento percentual nos ${windowLabel}.`;
  return (
    <ReportSection
      label="Top 5 publicações"
      title="Publicações com maior envolvimento"
      subtitle={subtitle}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {reportData.topPosts.map((post) => (
          <article
            key={post.id}
            className="bg-surface-secondary border border-border-default/40 rounded-xl shadow-card overflow-hidden flex flex-col"
          >
            <div
              className={cn(
                "relative aspect-square bg-gradient-to-br",
                post.thumbnail,
              )}
            >
              {post.thumbnailUrl ? (
                <img
                  src={post.thumbnailUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              <span className="absolute top-3 right-3 z-10 px-2 py-1 rounded-md bg-white/90 backdrop-blur font-mono text-[10px] uppercase tracking-wider text-content-primary font-semibold">
                {post.format}
              </span>
              <ExternalLink className="absolute top-3 left-3 z-10 size-3.5 text-white/80" />
            </div>
            <div className="p-4 flex flex-col gap-3 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-wider text-content-tertiary">
                {post.date}
              </p>
              <p className="text-sm text-content-primary leading-snug line-clamp-2">
                {post.caption}
              </p>
              <div className="flex items-center justify-between pt-2 mt-auto border-t border-border-subtle/30">
                <div className="flex items-center gap-3 text-xs text-content-secondary">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="size-3.5" />
                    <span className="font-mono">
                      {post.likes.toLocaleString("pt-PT")}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="size-3.5" />
                    <span className="font-mono">{post.comments}</span>
                  </span>
                </div>
                <span className="font-mono text-xs font-medium text-accent-primary">
                  {post.engagementPct.toString().replace(".", ",")}%
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </ReportSection>
  );
}
