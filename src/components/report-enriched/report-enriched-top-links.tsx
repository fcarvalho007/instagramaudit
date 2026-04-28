import { ExternalLink, Heart, MessageCircle } from "lucide-react";
import type { ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import { ENRICHED_COPY } from "./report-enriched-copy";

interface Props {
  enriched: ReportEnriched;
}

/**
 * Lista compacta dos top posts com permalinks reais. Funciona como
 * complemento ao `ReportTopPosts` locked (que mantém os cards visuais com
 * gradiente e não tem links). Esconde-se quando nenhum post tem permalink.
 */
export function ReportEnrichedTopLinks({ enriched }: Props) {
  const linkable = enriched.topPosts.filter((p) => Boolean(p.permalink));
  if (linkable.length === 0) return null;

  return (
    <section
      aria-label="Ligações diretas aos top posts"
      className="mx-auto max-w-7xl px-6 pt-4"
    >
      <div className="rounded-2xl border border-border-subtle/40 bg-surface-secondary/40 p-6 md:p-8 space-y-5">
        <header className="space-y-1.5 max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-content-tertiary">
            {ENRICHED_COPY.topLinks.eyebrow}
          </p>
          <h2 className="font-display text-xl md:text-2xl font-medium tracking-tight text-content-primary leading-snug">
            {ENRICHED_COPY.topLinks.title}
          </h2>
          <p className="text-sm text-content-secondary leading-relaxed">
            {ENRICHED_COPY.topLinks.subtitle}
          </p>
        </header>

        <ul className="divide-y divide-border-subtle/30 -mx-2">
          {linkable.map((post) => (
            <li key={post.id} className="px-2 py-3">
              <a
                href={post.permalink ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group grid grid-cols-1 sm:grid-cols-[auto_1fr_auto] sm:items-center gap-3 sm:gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary shrink-0 w-14">
                    {post.date}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-border-subtle/60 text-content-secondary shrink-0">
                    {post.format}
                  </span>
                </div>
                <p className="text-sm text-content-primary leading-snug line-clamp-2 group-hover:text-accent-primary transition-colors">
                  {post.caption || "Sem caption"}
                </p>
                <div className="flex items-center gap-4 sm:justify-end">
                  <span className="inline-flex items-center gap-1 text-xs text-content-secondary">
                    <Heart className="size-3.5" aria-hidden="true" />
                    <span className="font-mono">
                      {post.likes.toLocaleString("pt-PT")}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-content-secondary">
                    <MessageCircle className="size-3.5" aria-hidden="true" />
                    <span className="font-mono">{post.comments}</span>
                  </span>
                  <span className="font-mono text-xs font-medium text-accent-primary">
                    {post.engagementPct.toString().replace(".", ",")}%
                  </span>
                  <ExternalLink
                    className="size-3.5 text-content-tertiary group-hover:text-accent-primary transition-colors"
                    aria-hidden="true"
                  />
                </div>
              </a>
            </li>
          ))}
        </ul>

        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary">
          {ENRICHED_COPY.topLinks.linkLabel} · abre numa nova janela
        </p>
      </div>
    </section>
  );
}