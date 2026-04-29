import type { ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import type { ReportData } from "@/components/report/report-mock-data";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportSectionFrame } from "./report-section-frame";

interface Props {
  data: ReportData;
  enriched: ReportEnriched;
}

/**
 * Leitura estratégica gerada por IA — secção premium.
 * Usa os mesmos itens persistidos em `ReportData.aiInsights` (ou em
 * `enriched.aiInsights`, mais ricos) para apresentar cards numerados
 * generosos com faixa de cor lateral. Resumo técnico recolhido em
 * `<details>` no fim para auditoria sem ruído visual.
 *
 * Hidden quando o snapshot não traz insights.
 */
export function ReportAiReading({ data, enriched }: Props) {
  const items = data.aiInsights ?? [];
  if (items.length === 0) return null;

  const ai = enriched.aiInsights;
  const techMeta = ai
    ? {
        model: ai.model,
        generatedAt: formatPt(ai.generatedAt),
        items: ai.items,
      }
    : null;

  return (
    <ReportSectionFrame
      eyebrow="Leitura estratégica · IA editorial"
      title="O que estes dados dizem sobre o perfil"
      subtitle="Síntese editorial gerada a partir das métricas observadas, do envolvimento médio e da diferença face à referência de mercado."
      tone="soft-violet"
      ariaLabel="Leitura estratégica do relatório"
    >
      <div className="flex items-center gap-2 mb-5">
        <Sparkles
          className="size-4 text-accent-violet-luminous"
          aria-hidden="true"
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
          {items.length} {items.length === 1 ? "insight" : "insights"}
        </span>
      </div>

      <ol className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {items.map((item, idx) => (
          <li
            key={item.number}
            className={cn(
              "relative rounded-2xl border border-border-subtle/40",
              "bg-surface-base/70 backdrop-blur-sm",
              "p-5 md:p-6 space-y-3 min-w-0",
              "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute left-0 top-5 bottom-5 w-1 rounded-r-full",
                idx === 0
                  ? "bg-accent-primary"
                  : idx === 1
                    ? "bg-accent-violet"
                    : "bg-accent-gold",
              )}
            />
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-content-tertiary">
                {item.number}
              </span>
              <h3 className="font-display text-lg md:text-xl font-medium text-content-primary leading-snug tracking-tight">
                {item.label}
              </h3>
            </div>
            <p className="text-sm md:text-[15px] text-content-secondary leading-relaxed">
              {item.text}
            </p>
          </li>
        ))}
      </ol>

      {techMeta && techMeta.items.length > 0 ? (
        <details className="group mt-6">
          <summary className="cursor-pointer inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-content-tertiary hover:text-accent-primary transition-colors list-none [&::-webkit-details-marker]:hidden">
            <span>Ver detalhe técnico da leitura</span>
            <span
              aria-hidden="true"
              className="transition-transform group-open:rotate-90"
            >
              ›
            </span>
          </summary>
          <div className="mt-4 space-y-3 text-xs text-content-tertiary">
            <p>
              Confiança e evidências usadas em cada insight. Útil para
              auditar a leitura.
            </p>
            <ul className="space-y-2">
              {techMeta.items.map((it) => (
                <li
                  key={it.number}
                  className="border-l-2 border-border-subtle/40 pl-3"
                >
                  <p className="text-content-secondary">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary mr-2">
                      {it.number}
                    </span>
                    {it.title}
                  </p>
                  <p className="mt-1">
                    Confiança: {it.confidence}
                    <span className="mx-2 text-content-tertiary/50">·</span>
                    Evidência: {it.evidenceSummary}
                  </p>
                </li>
              ))}
            </ul>
            {(techMeta.model || techMeta.generatedAt) && (
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] pt-2">
                {techMeta.model ? `Modelo ${techMeta.model}` : null}
                {techMeta.model && techMeta.generatedAt ? " · " : null}
                {techMeta.generatedAt
                  ? `Gerado a ${techMeta.generatedAt}`
                  : null}
              </p>
            )}
          </div>
        </details>
      ) : null}
    </ReportSectionFrame>
  );
}

function formatPt(iso: string | null): string | null {
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