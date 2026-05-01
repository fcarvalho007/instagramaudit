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
        <button
          type="button"
          disabled
          aria-disabled="true"
          title="Disponível em breve"
          className="text-eyebrow shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-border-subtle/50 text-content-tertiary cursor-not-allowed self-start md:self-auto"
        >
          <UserPlus className="size-3.5" aria-hidden="true" />
          {ENRICHED_COPY.competitorsCta.cta} · em breve
        </button>
      </div>
    </section>
  );
}