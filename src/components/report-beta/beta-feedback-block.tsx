import { BETA_COPY } from "./beta-copy";

/**
 * Bloco final de feedback/conversão suave para a fase beta. Renderizado em
 * `/analyze/$username` depois do `TierComparisonBlock`. Sem billing, sem
 * paywall — acções de feedback e interesse Pro. As acções de partilha
 * (copiar link, LinkedIn, PDF) vivem em `ReportShareActions`.
 */
export function BetaFeedbackBlock() {
  const { feedback } = BETA_COPY;

  return (
    <section
      aria-label="Feedback sobre o relatório"
      className="mx-auto max-w-7xl px-6 pb-16"
    >
      <div className="rounded-2xl border border-border-subtle/40 bg-surface-secondary/40 p-6 md:p-10 space-y-6">
        <header className="space-y-2 max-w-2xl">
          <h2 className="font-display text-2xl md:text-3xl font-medium tracking-tight text-content-primary leading-tight">
            {feedback.title}
          </h2>
          <p className="text-sm md:text-base text-content-secondary leading-relaxed">
            {feedback.subtitle}
          </p>
        </header>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <a
            href={feedback.actions.feedback.href}
            className="inline-flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] px-4 py-2.5 rounded-full border border-accent-primary/40 text-accent-primary hover:text-accent-luminous hover:border-accent-luminous/60 transition-colors"
          >
            {feedback.actions.feedback.label}
            <span aria-hidden="true">→</span>
          </a>
          <a
            href={feedback.actions.pro.href}
            className="inline-flex items-center justify-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] px-4 py-2.5 rounded-full border border-accent-primary/40 text-accent-primary hover:text-accent-luminous hover:border-accent-luminous/60 transition-colors"
          >
            {feedback.actions.pro.label}
            <span aria-hidden="true">→</span>
          </a>
        </div>

        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-content-tertiary">
          {feedback.note}
        </p>
      </div>
    </section>
  );
}