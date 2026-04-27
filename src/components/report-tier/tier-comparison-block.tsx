import { TierTag } from "./tier-tag";
import { TIER_COPY } from "./tier-copy";

/**
 * End-of-report editorial block that contrasts what the free reading already
 * delivers vs. what the complete reading will unlock. No payment logic — the
 * CTA is a placeholder anchor until the paid flow exists.
 */
export function TierComparisonBlock() {
  const { comparison } = TIER_COPY;
  const { essential, complete } = comparison.columns;

  return (
    <section
      id="leitura-completa"
      aria-label="Diferença entre relatório gratuito e completo"
      className="mx-auto max-w-7xl px-6 pb-12 md:pb-16 scroll-mt-24"
    >
      <div className="rounded-2xl border border-border-subtle/40 bg-surface-secondary/40 p-6 md:p-10 space-y-8">
        <header className="space-y-2 max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-content-tertiary">
            {comparison.eyebrow}
          </p>
          <h2 className="font-display text-2xl md:text-3xl font-medium tracking-tight text-content-primary leading-tight">
            {comparison.title}
          </h2>
          <p className="text-sm md:text-base text-content-secondary leading-relaxed">
            {comparison.subtitle}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
          <ColumnCard
            tag={<TierTag variant="essential" />}
            heading={essential.heading}
            items={[...essential.items]}
            tone="neutral"
          />
          <ColumnCard
            tag={<TierTag variant="complete" />}
            heading={complete.heading}
            items={[...complete.items]}
            tone="accent"
          />
        </div>

        <div className="border-t border-border-subtle/30 pt-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <p className="font-display text-base md:text-lg italic text-content-primary/90 leading-snug max-w-2xl">
            “{comparison.closing}”
          </p>
          <a
            href={comparison.ctaHref}
            aria-disabled={comparison.ctaPending ? "true" : undefined}
            data-pending={comparison.ctaPending ? "true" : undefined}
            className="shrink-0 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] px-4 py-2.5 rounded-full border border-accent-primary/40 text-accent-primary hover:text-accent-luminous hover:border-accent-luminous/60 transition-colors self-start md:self-auto"
          >
            {comparison.cta}
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}

interface ColumnCardProps {
  tag: React.ReactNode;
  heading: string;
  items: string[];
  tone: "neutral" | "accent";
}

function ColumnCard({ tag, heading, items, tone }: ColumnCardProps) {
  return (
    <div
      className={
        tone === "accent"
          ? "rounded-xl border border-accent-primary/20 bg-accent-primary/[0.03] p-5 md:p-6 space-y-4"
          : "rounded-xl border border-border-subtle/30 bg-surface-base/40 p-5 md:p-6 space-y-4"
      }
    >
      {tag}
      <h3
        className={
          tone === "accent"
            ? "font-display text-lg md:text-xl font-medium tracking-tight text-accent-primary leading-snug"
            : "font-display text-lg md:text-xl font-medium tracking-tight text-content-primary leading-snug"
        }
      >
        {heading}
      </h3>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2.5 text-sm text-content-secondary leading-relaxed"
          >
            <span
              aria-hidden="true"
              className={
                tone === "accent"
                  ? "mt-2 h-1 w-1 rounded-full bg-accent-primary shrink-0"
                  : "mt-2 h-1 w-1 rounded-full bg-content-tertiary/60 shrink-0"
              }
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}