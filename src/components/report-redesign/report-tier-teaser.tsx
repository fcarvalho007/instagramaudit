import { ArrowRight } from "lucide-react";
import { TIER_COPY } from "@/components/report-tier/tier-copy";

/**
 * Teaser compacto Free vs Pro para encurtar o relatório.
 * Substitui o `TierComparisonBlock` grande no novo shell, mantendo
 * a mensagem essencial sem sobrecarregar o final do scroll.
 */
export function ReportTierTeaser() {
  const { complete } = TIER_COPY.comparison.columns;
  const top3 = complete.items.slice(0, 3);
  return (
    <section
      aria-label="O que vem no relatório completo"
      className="mx-auto max-w-7xl px-5 md:px-6 pt-2 pb-2"
    >
      <div className="rounded-2xl border border-accent-violet/25 bg-accent-violet/[0.04] p-5 md:p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1.5 max-w-2xl min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent-violet">
            {TIER_COPY.comparison.eyebrow}
          </p>
          <h3 className="font-display text-lg md:text-xl font-medium text-content-primary leading-snug tracking-tight">
            {TIER_COPY.comparison.title}
          </h3>
          <ul className="text-sm text-content-secondary leading-relaxed">
            {top3.map((it) => (
              <li key={it} className="flex items-start gap-2">
                <span
                  aria-hidden="true"
                  className="text-accent-violet pt-1.5"
                >
                  ·
                </span>
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
        <a
          href="#leitura-completa"
          className="shrink-0 inline-flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-accent-violet hover:text-accent-violet-luminous transition-colors"
        >
          Saber mais <ArrowRight className="size-3.5" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}