import { Database, LineChart, Sparkles, Search, ExternalLink, BookOpen } from "lucide-react";
import { ReportSectionFrame } from "./report-section-frame";
import { REDESIGN_TOKENS } from "./report-tokens";
import {
  BENCHMARK_DATASET_VERSION,
  INSTAGRAM_BENCHMARK_CONTEXT,
} from "@/lib/knowledge/benchmark-context";

/**
 * Metodologia humana, não-técnica. Grid das três famílias de fonte
 * seguida (opcional) pela linha fina de proveniência do dataset de
 * benchmark. Databox fica fora desta lista (visibilidade `future`) e
 * é mencionado em itálico discreto como reserva para futura ligação
 * autenticada.
 */
export function ReportMethodology() {
  const sources = [
    {
      icon: Database,
      label: "Recolha automática",
      body: "Métricas públicas extraídas diretamente do perfil, sem login nem dados privados.",
    },
    {
      icon: LineChart,
      label: "Referência de mercado",
      body: "Dataset interno de perfis pares, para contextualizar envolvimento e formato.",
    },
    {
      icon: Sparkles,
      label: "Leitura editorial",
      body: "Síntese gerada por IA com base nos números observados — insight auditável.",
    },
    {
      icon: Search,
      label: "Sinais de procura",
      body: "Indicadores públicos de procura associados aos temas do perfil.",
    },
  ] as const;

  // Só fontes activas — Databox e outras `future` ficam reservadas para futura ligação autenticada.
  const benchmarkSources = INSTAGRAM_BENCHMARK_CONTEXT.sources.filter(
    (source) => source.visibility === "active",
  );

  return (
    <ReportSectionFrame
      eyebrow="Metodologia"
      title="Como este relatório foi feito"
      subtitle="Quatro fontes complementam a leitura — recolha pública, referência de mercado, leitura editorial e sinais de procura."
      tone="calm"
      spacing="tight"
      ariaLabel="Metodologia e fontes de dados"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {sources.map(({ icon: Icon, label, body }) => (
          <div
            key={label}
            className={`${REDESIGN_TOKENS.card} p-4 md:p-5 space-y-3 min-w-0`}
          >
            <span
              aria-hidden="true"
              className="inline-flex size-9 items-center justify-center rounded-lg bg-white border border-border-default text-accent-primary"
            >
              <Icon className="size-4" />
            </span>
            <p className="text-eyebrow-sm text-content-tertiary">
              {label}
            </p>
            <p className="text-sm text-content-secondary leading-relaxed">
              {body}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 md:mt-6 pt-4 md:pt-5 border-t border-border-default/70">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
          <p className="text-eyebrow-sm text-content-tertiary">
            Fontes de referência
          </p>
          <p className="text-xs text-content-tertiary tabular-nums">
            dataset {BENCHMARK_DATASET_VERSION}
          </p>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {benchmarkSources.map((source) => (
            <li
              key={source.name}
              className="flex items-start gap-3 rounded-lg border border-border-default/70 bg-white px-3 py-2.5 min-w-0"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md ring-1 bg-indigo-50 text-indigo-700 ring-indigo-200"
              >
                <BookOpen className="size-3.5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm text-content-primary leading-tight">
                  <span className="font-medium">{source.name}</span>
                  <span className="ml-1.5 tabular-nums text-xs text-content-tertiary">
                    {source.lastUpdatedLabel ?? String(source.publishedYear)}
                  </span>
                </p>
                <p className="text-[12px] text-content-secondary leading-snug">
                  {source.shortDescription}
                </p>
              </div>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Abrir página da ${source.name} numa nova aba`}
                className="shrink-0 inline-flex size-7 items-center justify-center rounded-md text-content-tertiary hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
              >
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </ReportSectionFrame>
  );
}
