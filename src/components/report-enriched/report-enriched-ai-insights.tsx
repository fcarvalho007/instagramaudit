import { Sparkles } from "lucide-react";
import type { ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import { ENRICHED_COPY } from "./report-enriched-copy";

interface Props {
  enriched: ReportEnriched;
}

/**
 * Companion ao bloco locked `ReportAiInsights`. Mostra a camada
 * editorial extra que o componente locked não exibe hoje:
 * `confidence` por insight, `evidenceSummary` (sinais citados pelo
 * modelo) e a meta `gerado por <model> em <data>`.
 *
 * Não chama OpenAI. Lê apenas `enriched.aiInsights`, que o adapter
 * preenche a partir de `normalized_payload.ai_insights_v1`. Quando o
 * snapshot não tem insights persistidos, devolve `null` — sem
 * placeholder, sem secção vazia.
 *
 * Nunca consumido por `/report/example`.
 */
export function ReportEnrichedAiInsights({ enriched }: Props) {
  const ai = enriched.aiInsights;
  if (!ai || ai.items.length === 0) return null;

  const generatedAtLabel = formatGeneratedAt(ai.generatedAt);
  const modelLabel = ai.model ?? null;

  return (
    <section
      aria-label="Detalhe da leitura estratégica gerada por IA"
      className="mx-auto max-w-7xl px-6 pt-4"
    >
      <div className="rounded-2xl border border-border-subtle/40 bg-surface-secondary/40 p-6 md:p-8 space-y-6">
        <header className="space-y-1.5 max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-content-tertiary">
            {ENRICHED_COPY.aiInsights.eyebrow}
          </p>
          <h2 className="font-display text-xl md:text-2xl font-medium tracking-tight text-content-primary leading-snug">
            {ENRICHED_COPY.aiInsights.title}
          </h2>
          <p className="text-sm text-content-secondary leading-relaxed">
            {ENRICHED_COPY.aiInsights.subtitle}
          </p>
        </header>

        <ul className="space-y-4">
          {ai.items.map((item) => (
            <li
              key={item.number}
              className="rounded-xl border border-border-subtle/40 bg-surface-base/60 p-5 md:p-6"
            >
              <div className="flex items-start gap-3 md:gap-4">
                <div className="shrink-0 h-8 w-8 rounded-md border border-border-subtle/60 bg-surface-secondary flex items-center justify-center">
                  <Sparkles
                    className="size-4 text-accent-secondary"
                    aria-hidden="true"
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary">
                      {item.number}
                    </span>
                    <h3 className="text-sm md:text-[15px] font-medium text-content-primary leading-snug">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-sm text-content-secondary leading-relaxed">
                    {item.body}
                  </p>
                  <dl className="flex flex-wrap gap-x-5 gap-y-1.5 pt-2">
                    <div className="inline-flex items-baseline gap-2">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary">
                        {ENRICHED_COPY.aiInsights.confidenceLabel}
                      </dt>
                      <dd className="text-xs text-content-secondary">
                        {item.confidence}
                      </dd>
                    </div>
                    <div className="inline-flex items-baseline gap-2 min-w-0">
                      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary shrink-0">
                        {ENRICHED_COPY.aiInsights.evidenceLabel}
                      </dt>
                      <dd className="text-xs text-content-secondary truncate">
                        {item.evidenceSummary}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {(generatedAtLabel || modelLabel) && (
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
            {[
              modelLabel ? `${ENRICHED_COPY.aiInsights.modelPrefix} ${modelLabel}` : null,
              generatedAtLabel
                ? `${ENRICHED_COPY.aiInsights.generatedPrefix} ${generatedAtLabel}`
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </div>
    </section>
  );
}

/**
 * Format an ISO timestamp into a short pt-PT label. Returns null when
 * the input is missing or unparsable so the meta line can hide cleanly.
 */
function formatGeneratedAt(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return null;
  }
}
