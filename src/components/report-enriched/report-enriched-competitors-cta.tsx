import { UserPlus } from "lucide-react";
import { ENRICHED_COPY } from "./report-enriched-copy";

/**
 * CTA editorial para preencher a empty-state da secção de concorrentes
 * sem editar o `ReportCompetitors` locked. Renderizado apenas quando o
 * snapshot não trouxe concorrentes (`coverage.competitors === "empty"`).
 * Visual only — sem submissão, sem chamada a providers.
 */
export function ReportEnrichedCompetitorsCta() {
  return (
    <section
      aria-label="Adicionar concorrentes para comparação"
      className="mx-auto max-w-7xl px-6 pt-4"
    >
      <div className="rounded-2xl border border-accent-primary/20 bg-accent-primary/[0.03] p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <p className="text-eyebrow text-accent-primary">
            {ENRICHED_COPY.competitorsCta.eyebrow}
          </p>
          <h2 className="font-display text-xl md:text-2xl font-medium tracking-tight text-content-primary leading-snug">
            {ENRICHED_COPY.competitorsCta.title}
          </h2>
          <p className="text-sm md:text-[15px] text-content-secondary leading-relaxed">
            {ENRICHED_COPY.competitorsCta.body}
          </p>
        </div>
        <div className="shrink-0 flex flex-col items-start md:items-end gap-1.5 self-start md:self-auto">
          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Disponível nas secções premium."
            className="text-eyebrow inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-border-subtle/50 text-content-tertiary cursor-not-allowed"
          >
            <UserPlus className="size-3.5" aria-hidden="true" />
            {ENRICHED_COPY.competitorsCta.cta}
          </button>
          <span className="text-xs text-content-tertiary">
            Disponível nas secções premium.
          </span>
        </div>
      </div>
    </section>
  );
}