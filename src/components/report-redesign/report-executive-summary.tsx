import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import { cn } from "@/lib/utils";

interface Props {
  result: AdapterResult;
}

/**
 * Faixa de KPIs grandes com leitura imediata. Sem cards pesados — usa
 * dividers e tipografia em escala editorial. Os mesmos números viverão
 * dentro do `ReportKeyMetrics` locked, mas aqui aparecem acima do fold
 * em mobile, sem repetir os tints visuais do bloco analítico.
 */
export function ReportExecutiveSummary({ result }: Props) {
  const k = result.data.keyMetrics;
  const meta = result.data.meta;
  const benchmarkLabel =
    meta.benchmarkStatus === "real"
      ? "Ligado"
      : meta.benchmarkStatus === "partial"
        ? "Parcial"
        : "Em afinação";

  const items: Array<{ value: string; label: string; help?: string }> = [
    {
      value: `${k.engagementRate.toFixed(2)}%`,
      label: "Envolvimento médio",
      help: `vs. ${k.engagementBenchmark.toFixed(2)}% de referência`,
    },
    {
      value: String(k.postsAnalyzed),
      label: "Publicações analisadas",
    },
    {
      value: k.postingFrequencyWeekly.toFixed(1),
      label: "Publicações por semana",
    },
    {
      value: k.dominantFormat,
      label: "Formato dominante",
      help: `${k.dominantFormatShare}% da amostra`,
    },
    {
      value: benchmarkLabel,
      label: "Estado do benchmark",
    },
  ];

  return (
    <section
      aria-label="Resumo executivo"
      className="w-full bg-surface-secondary/20 border-y border-border-subtle/30"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-6 py-8 md:py-10">
        <div
          className={cn(
            "grid grid-cols-2 gap-x-4 gap-y-6",
            "sm:grid-cols-3 md:grid-cols-5",
            "md:divide-x md:divide-border-subtle/30",
          )}
        >
          {items.map((item, idx) => (
            <div
              key={item.label}
              className={cn(
                "min-w-0 space-y-1.5",
                "md:px-5",
                idx === 0 ? "md:pl-0" : "",
                idx === items.length - 1 ? "md:pr-0" : "",
                // Em mobile a quinta KPI ocupa linha inteira para não quebrar a grelha
                idx === 4 ? "col-span-2 sm:col-span-3 md:col-span-1" : "",
              )}
            >
              <p className="font-display text-2xl md:text-[2rem] font-medium text-content-primary leading-tight tracking-tight break-words">
                {item.value}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-content-tertiary">
                {item.label}
              </p>
              {item.help ? (
                <p className="text-xs text-content-secondary/90 leading-snug">
                  {item.help}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}