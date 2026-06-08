import { cn } from "@/lib/utils";
import type { CardReading } from "@/lib/comparison-readings/types";

const CONFIDENCE_LABEL: Record<CardReading["confidence"], string> = {
  low: "Confiança baixa",
  medium: "Confiança média",
  high: "Confiança alta",
};

/**
 * Optional editorial AI reading rendered BELOW the deterministic card.
 * If `reading` is null/undefined, renders nothing so the deterministic
 * card is unchanged.
 */
export function LeituraIaBox({
  reading,
  className,
}: {
  reading: CardReading | null | undefined;
  className?: string;
}) {
  if (!reading) return null;
  return (
    <aside
      aria-label="Leitura IA"
      className={cn(
        "mt-4 rounded-xl border border-border-subtle bg-surface-muted/60 px-5 py-4 sm:px-6 sm:py-5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-eyebrow-sm text-[var(--accent-primary)]">
          ● Leitura IA
        </p>
        <span className="text-[10px] uppercase tracking-wider text-content-tertiary">
          {CONFIDENCE_LABEL[reading.confidence]}
        </span>
      </div>
      <p className="text-base sm:text-lg text-content-primary font-semibold leading-snug">
        {reading.headline}
      </p>
      <p className="mt-2 text-sm sm:text-base text-content-secondary leading-relaxed">
        {reading.key_reading}
      </p>
      {reading.recommendation ? (
        <p className="mt-3 text-sm text-content-secondary">
          <span className="font-semibold text-content-primary">Sugestão: </span>
          {reading.recommendation}
        </p>
      ) : null}
      {reading.caveats.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-content-tertiary">
          {reading.caveats.map((c, i) => (
            <li key={i}>· {c}</li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}

/** Top-of-comparison executive summary. */
export function LeituraIaExecutiveSummary({
  global,
  className,
}: {
  global: {
    headline: string;
    key_reading: string;
    confidence: CardReading["confidence"];
  } | null;
  className?: string;
}) {
  if (!global) return null;
  return (
    <section
      aria-label="Leitura IA — resumo"
      className={cn(
        "rounded-2xl border border-border-default bg-surface-primary shadow-card px-6 py-5 sm:px-8 sm:py-6",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-eyebrow-sm text-[var(--accent-primary)]">
          ● Leitura IA · síntese
        </p>
        <span className="text-[10px] uppercase tracking-wider text-content-tertiary">
          {CONFIDENCE_LABEL[global.confidence]}
        </span>
      </div>
      <h3 className="font-serif text-content-primary text-xl sm:text-2xl leading-tight mt-2">
        {global.headline}
      </h3>
      <p className="mt-3 text-sm sm:text-base text-content-secondary leading-relaxed">
        {global.key_reading}
      </p>
    </section>
  );
}