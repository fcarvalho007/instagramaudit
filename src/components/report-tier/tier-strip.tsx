import { TierTag } from "./tier-tag";
import { TIER_COPY } from "./tier-copy";

/**
 * Top-of-report editorial strip that frames the free report as a real but
 * intentionally compact diagnostic, and points the reader to the comparison
 * block at the bottom of the page for the complete reading.
 *
 * Rendered only inside `/analyze/$username` — never on `/report/example`.
 */
export function TierStrip() {
  const { strip } = TIER_COPY;
  return (
    <section
      aria-label="Âmbito deste relatório"
      className="mx-auto max-w-7xl px-6 pt-6"
    >
      <div className="rounded-2xl border border-border-subtle/40 bg-surface-secondary/60 backdrop-blur-sm p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-2 max-w-3xl">
          <TierTag variant="essential" label={strip.eyebrow} />
          <p className="text-sm md:text-[15px] text-content-secondary leading-relaxed font-sans">
            {strip.body}
          </p>
        </div>
        <a
          href={strip.ctaHref}
          className="shrink-0 inline-flex items-center gap-2 self-start md:self-auto font-mono text-[11px] uppercase tracking-[0.16em] text-accent-primary hover:text-accent-luminous transition-colors"
        >
          {strip.cta}
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}