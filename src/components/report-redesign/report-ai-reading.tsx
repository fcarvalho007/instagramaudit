import type { ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import type { ReportData } from "@/components/report/report-mock-data";
import { cn } from "@/lib/utils";
import { ReportSectionFrame } from "./report-section-frame";
import { REDESIGN_TOKENS } from "./report-tokens";

interface Props {
  data: ReportData;
  enriched: ReportEnriched;
  /**
   * Quando `true`, suprime o cabeçalho da `ReportSectionFrame`
   * para evitar duplicar a pergunta editorial dominante quando
   * a leitura está aninhada num bloco do `ReportShellV2`.
   * Default: `false` — comportamento original preservado.
   */
  compact?: boolean;
}

/**
 * Substituições editoriais aplicadas no render para suavizar copy
 * técnica que possa ter sido persistida em snapshots antigos. Não
 * mutam dados — apenas formatação na camada de apresentação.
 */
const TECH_REPLACEMENTS: Array<[RegExp, string]> = [
  [/engagement_pct/gi, "envolvimento médio"],
  [/benchmark_value_pct/gi, "referência esperada"],
  [/profile_value_pct/gi, "valor do perfil"],
  [/difference_pct/gi, "diferença face à referência"],
  [/position\s+below/gi, "abaixo da referência"],
  [/position\s+above/gi, "acima da referência"],
  [/dominant_format/gi, "formato dominante"],
  [/avg_engagement/gi, "envolvimento médio"],
  [/posts_per_week/gi, "ritmo de publicação"],
  [/reach_rate/gi, "alcance médio"],
  [/bench_vs_market/gi, "comparação com o mercado"],
  [/format_mix/gi, "mistura de formatos"],
  [/top_format/gi, "formato com mais retorno"],
];
function humanize(text: string): string {
  return TECH_REPLACEMENTS.reduce((acc, [re, sub]) => acc.replace(re, sub), text);
}

/**
 * Leitura estratégica gerada por IA — secção premium.
 * Cards brancos com badge numerado azul Iconosquare-style. Resumo
 * técnico recolhido em `<details>` no fim para auditoria sem ruído.
 *
 * Hidden quando o snapshot não traz insights.
 */
export function ReportAiReading({ data, enriched, compact = false }: Props) {
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
      tone="white"
      ariaLabel="Leitura estratégica do relatório"
      compact={compact}
    >
      <ol className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
        {items.map((item, idx) => (
          <li
            key={item.number}
            className={cn(
              REDESIGN_TOKENS.card,
              "p-5 md:p-6 space-y-3 min-w-0",
            )}
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  "inline-flex size-8 shrink-0 items-center justify-center rounded-full",
                  "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
                  "font-mono text-[11px] font-semibold tracking-tight",
                )}
              >
                {item.number}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 rounded-full",
                  idx === 0
                    ? "bg-blue-500"
                    : idx === 1
                      ? "bg-amber-500"
                      : "bg-slate-300",
                )}
              />
            </div>
            <h3 className="font-display text-lg md:text-xl font-medium text-slate-900 leading-snug tracking-tight">
              {humanize(item.label)}
            </h3>
            <p className="text-sm md:text-[15px] text-slate-600 leading-relaxed">
              {humanize(item.text)}
            </p>
          </li>
        ))}
      </ol>

      {techMeta && techMeta.items.length > 0 ? (
        <details className="group mt-6">
          <summary className="cursor-pointer inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500 hover:text-blue-600 transition-colors list-none [&::-webkit-details-marker]:hidden">
            <span>Ver base e sinais usados</span>
            <span
              aria-hidden="true"
              className="transition-transform group-open:rotate-90"
            >
              ›
            </span>
          </summary>
          <div className="mt-4 space-y-3 text-xs text-slate-500">
            <p>
              Para cada leitura mostramos a base (forte ou parcial) e os
              sinais que a fundamentam. Útil para auditar a interpretação.
            </p>
            <ul className="space-y-2">
              {techMeta.items.map((it) => (
                <li
                  key={it.number}
                  className="border-l-2 border-slate-200 pl-3"
                >
                  <p className="text-slate-600">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 mr-2">
                      {it.number}
                    </span>
                    {humanize(it.title)}
                  </p>
                  <p className="mt-1">
                    Base da leitura: {it.confidence}
                    <span className="mx-2 text-slate-300">·</span>
                    Sinais: {humanize(it.evidenceSummary)}
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