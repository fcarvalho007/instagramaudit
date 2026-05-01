import { Info } from "lucide-react";
import type { ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import { ENRICHED_COPY } from "./report-enriched-copy";

interface Props {
  enriched: ReportEnriched;
}

/**
 * Nota tipográfica fina com fonte e metodologia do benchmark. Renderizada
 * por baixo do `<ReportPage />` (que contém o gauge e o format-breakdown
 * locked) para dar contexto sem editar os componentes locked.
 */
export function ReportEnrichedBenchmarkSource({ enriched }: Props) {
  const { datasetVersion, note } = enriched.benchmarkSource;
  return (
    <section
      aria-label="Fonte e metodologia do benchmark"
      className="mx-auto max-w-7xl px-6 pt-2"
    >
      <div className="rounded-2xl border border-border-subtle/30 bg-surface-secondary/30 p-5 md:p-6 flex items-start gap-3">
        <Info
          className="size-4 shrink-0 text-content-tertiary mt-0.5"
          aria-hidden="true"
        />
        <div className="space-y-1.5 min-w-0">
          <p className="text-eyebrow-sm text-content-tertiary">
            {ENRICHED_COPY.benchmarkSource.eyebrow}
            {datasetVersion ? (
              <>
                <span className="mx-2 text-content-tertiary/60">·</span>
                <span>
                  {ENRICHED_COPY.benchmarkSource.datasetPrefix} {datasetVersion}
                </span>
              </>
            ) : null}
          </p>
          <p className="text-sm text-content-secondary leading-relaxed">
            {note}
          </p>
        </div>
      </div>
    </section>
  );
}