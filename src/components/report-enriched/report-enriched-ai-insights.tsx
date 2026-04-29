import type { ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import { ENRICHED_COPY } from "./report-enriched-copy";

interface Props {
  enriched: ReportEnriched;
}

/**
 * Rodapé subtil ao bloco locked `ReportAiInsights`. Em vez de duplicar
 * a leitura editorial, apresenta uma linha tipográfica com o resumo
 * técnico (confiança média, número de sinais citados, modelo, data) e
 * um `<details>` colapsável "Ver detalhe por insight" para utilizadores
 * que queiram auditar a leitura. Fica fechado por omissão para não
 * sobrecarregar utilizadores não-técnicos.
 *
 * Não chama OpenAI. Lê apenas `enriched.aiInsights`. Devolve `null`
 * quando o snapshot não tem insights persistidos. Nunca consumido por
 * `/report/example`.
 */
export function ReportEnrichedAiInsights({ enriched }: Props) {
  const ai = enriched.aiInsights;
  if (!ai || ai.items.length === 0) return null;

  const generatedAtLabel = formatGeneratedAt(ai.generatedAt);
  const modelLabel = ai.model ?? null;
  const footerCopy = ENRICHED_COPY.aiInsightsFooter;

  // Confiança média a partir dos níveis declarados pelo modelo.
  const avgConfidence = computeAverageConfidence(
    ai.items.map((it) => it.confidence),
  );
  // Total de sinais citados (separados por vírgula em `evidenceSummary`).
  const totalSignals = ai.items.reduce((acc, it) => {
    const parts = it.evidenceSummary
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return acc + parts.length;
  }, 0);

  const summaryParts = [
    avgConfidence
      ? `${footerCopy.summaryPrefix} ${avgConfidence}`
      : null,
    totalSignals > 0 ? `${totalSignals} ${footerCopy.signalsPrefix}` : null,
    modelLabel ? `${ENRICHED_COPY.aiInsights.modelPrefix} ${modelLabel}` : null,
    generatedAtLabel
      ? `${ENRICHED_COPY.aiInsights.generatedPrefix} ${generatedAtLabel}`
      : null,
  ].filter(Boolean) as string[];

  return (
    <section
      aria-label="Resumo técnico da leitura estratégica gerada por IA"
      className="mx-auto max-w-7xl px-6 pt-2"
    >
      <div className="border-t border-border-subtle/30 pt-4 space-y-3">
        <p className="text-xs md:text-[13px] text-content-tertiary leading-relaxed max-w-3xl">
          {footerCopy.helpLine}
        </p>
        {summaryParts.length > 0 && (
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
            {summaryParts.join(" · ")}
          </p>
        )}
        <details className="group">
          <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.16em] text-accent-primary hover:text-accent-luminous transition-colors list-none [&::-webkit-details-marker]:hidden inline-flex items-center gap-1.5">
            <span>{footerCopy.detailsLabel}</span>
            <span aria-hidden="true" className="transition-transform group-open:rotate-90">›</span>
          </summary>
          <ul className="mt-4 space-y-3">
            {ai.items.map((item) => (
              <li
                key={item.number}
                className="border-l-2 border-border-subtle/40 pl-4 space-y-1.5"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary">
                    {item.number}
                  </span>
                  <h3 className="text-sm font-medium text-content-primary leading-snug">
                    {item.title}
                  </h3>
                </div>
                <dl className="flex flex-wrap gap-x-5 gap-y-1">
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
                    <dd className="text-xs text-content-secondary break-words min-w-0">
                      {item.evidenceSummary}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  );
}

/**
 * Calcula a confiança média a partir dos níveis declarados pelo modelo.
 * Aceita rótulos pt-PT ("alta", "média", "baixa") e devolve o rótulo
 * predominante. Devolve `null` se não houver dados.
 */
function computeAverageConfidence(levels: string[]): string | null {
  if (levels.length === 0) return null;
  const score = (l: string): number => {
    const v = l.toLowerCase().trim();
    if (v.startsWith("alt")) return 3;
    if (v.startsWith("méd") || v.startsWith("med")) return 2;
    if (v.startsWith("bai") || v.startsWith("low")) return 1;
    return 0;
  };
  const valid = levels.map(score).filter((n) => n > 0);
  if (valid.length === 0) return null;
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  if (avg >= 2.5) return "alta";
  if (avg >= 1.5) return "média";
  return "baixa";
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
