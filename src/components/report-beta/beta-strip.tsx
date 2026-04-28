import { BETA_COPY } from "./beta-copy";

/**
 * Tira de posicionamento beta, renderizada por baixo da `TierStrip` em
 * `/analyze/$username`. Comunica que o relatório está em modo gratuito
 * alargado durante a fase beta, sem linguagem de paywall.
 *
 * Nunca usada em `/report/example`.
 */
export function BetaStrip() {
  const { strip } = BETA_COPY;
  return (
    <section
      aria-label="Posicionamento beta"
      className="mx-auto max-w-7xl px-6 pt-4"
    >
      <div className="rounded-2xl border border-border-subtle/40 bg-surface-secondary/40 backdrop-blur-sm p-5 md:p-6 space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-primary">
          {strip.eyebrow}
        </p>
        <h2 className="font-display text-lg md:text-xl font-medium tracking-tight text-content-primary leading-snug">
          {strip.title}
        </h2>
        <p className="text-sm md:text-[15px] text-content-secondary leading-relaxed font-sans max-w-3xl">
          {strip.body}
        </p>
      </div>
    </section>
  );
}