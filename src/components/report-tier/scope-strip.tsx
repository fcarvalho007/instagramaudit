import { TIER_COPY } from "./tier-copy";

/**
 * Tira editorial única no topo do relatório que combina o âmbito
 * (visão essencial) com o posicionamento beta. Substitui o par anterior
 * `TierStrip` + `BetaStrip`, que duplicavam mensagem e empurravam o utilizador
 * para baixo antes de chegar aos dados do perfil.
 *
 * Sem CTAs — a acção principal do relatório (PDF) vive no bloco final.
 */
export function ScopeStrip() {
  const { scope } = TIER_COPY;
  return (
    <section
      aria-label="Âmbito do relatório"
      className="mx-auto max-w-7xl px-6 pt-6"
    >
      <div className="rounded-2xl border border-border-subtle/40 bg-surface-secondary/50 backdrop-blur-sm p-5 md:p-6 space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent-primary">
          {scope.eyebrow}
        </p>
        <h2 className="font-display text-lg md:text-xl font-medium tracking-tight text-content-primary leading-snug">
          {scope.title}
        </h2>
        <p className="text-sm md:text-[15px] text-content-secondary leading-relaxed font-sans max-w-3xl">
          {scope.body}
        </p>
      </div>
    </section>
  );
}