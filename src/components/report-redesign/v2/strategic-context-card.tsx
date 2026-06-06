/**
 * Bloco 06 · Contexto estratégico — cartão editorial final do Pro report.
 *
 * Renderiza:
 *   - eyebrow + H2
 *   - síntese editorial (1 parágrafo)
 *   - até 3 pilares (Padrão forte / Risco editorial / Sinal a acompanhar)
 *   - fallback gracioso quando o sinal é insuficiente
 */

import { cn } from "@/lib/utils";
import type { StrategicContext, StrategicPillarKind } from "@/lib/report/strategic-context";

interface Props {
  context: StrategicContext;
}

const PILLAR_STYLE: Record<
  StrategicPillarKind,
  { eyebrow: string; accent: string }
> = {
  strength: {
    eyebrow: "text-signal-success",
    accent: "bg-signal-success/60",
  },
  risk: {
    eyebrow: "text-signal-warning",
    accent: "bg-signal-warning/60",
  },
  watch: {
    eyebrow: "text-accent-primary",
    accent: "bg-accent-primary/60",
  },
};

export function StrategicContextCard({ context }: Props) {
  return (
    <section
      aria-label="Contexto estratégico"
      className="space-y-6 md:space-y-8"
    >
      <header className="space-y-3">
        <p className="text-eyebrow-sm text-content-tertiary">
          06 · Contexto estratégico
        </p>
        <h2 className="font-display text-[1.75rem] md:text-[2rem] leading-tight tracking-tight text-content-primary">
          O que estes sinais dizem sobre o perfil?
        </h2>
      </header>

      <p className="text-[15px] md:text-base leading-relaxed text-content-secondary max-w-3xl">
        {context.summary}
      </p>

      {context.pillars.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {context.pillars.map((p) => {
            const s = PILLAR_STYLE[p.kind];
            return (
              <article
                key={`${p.kind}-${p.title}`}
                className={cn(
                  "relative h-full rounded-2xl border border-border-default bg-surface-secondary",
                  "p-5 md:p-6 flex flex-col gap-3",
                  "shadow-card overflow-hidden",
                )}
              >
                <span
                  className={cn("absolute left-0 top-0 h-full w-[3px]", s.accent)}
                  aria-hidden
                />
                <p className={cn("text-eyebrow-sm", s.eyebrow)}>
                  {p.eyebrow}
                </p>
                <h3 className="font-display text-[1.05rem] font-semibold tracking-tight text-content-primary leading-snug">
                  {p.title}
                </h3>
                <p className="text-sm text-content-secondary leading-relaxed">
                  {p.body}
                </p>
              </article>
            );
          })}
        </div>
      ) : context.insufficient ? (
        <p className="text-sm text-content-tertiary italic max-w-2xl">
          Sinais insuficientes para conclusões editoriais mais detalhadas
          nesta amostra.
        </p>
      ) : null}
    </section>
  );
}