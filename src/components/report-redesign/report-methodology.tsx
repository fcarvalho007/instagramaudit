import { Database, LineChart, Sparkles, Search, ExternalLink } from "lucide-react";
import { ReportSectionFrame } from "./report-section-frame";
import { REDESIGN_TOKENS } from "./report-tokens";
import type { ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import {
  INSTAGRAM_BENCHMARK_CONTEXT,
  BENCHMARK_DATASET_VERSION,
  getActiveBenchmarkSources,
} from "@/lib/knowledge/benchmark-context";
import { cn } from "@/lib/utils";

interface Props {
  enriched?: ReportEnriched;
}

/**
 * Metodologia humana, não-técnica. Grid das três famílias de fonte
 * seguida (opcional) pela linha fina de proveniência do dataset de
 * benchmark. Databox fica fora desta lista (visibilidade `future`) e
 * é mencionado em itálico discreto como reserva para futura ligação
 * autenticada.
 */
export function ReportMethodology({ enriched }: Props = {}) {
  const sources = [
    {
      icon: Database,
      label: "Recolha automática",
      body: "Métricas públicas extraídas directamente do perfil de Instagram analisado, sem login nem dados privados.",
    },
    {
      icon: LineChart,
      label: "Referência de mercado",
      body: "Dataset interno versionado de perfis pares, usado para contextualizar engagement e formato dominante.",
    },
    {
      icon: Sparkles,
      label: "Leitura editorial",
      body: "Síntese gerada por modelo de linguagem com base nos números observados — auditável insight a insight.",
    },
    {
      icon: Search,
      label: "Sinais de pesquisa",
      body: "Indicadores públicos de procura associados aos temas do perfil, para perceber relevância fora da plataforma.",
    },
  ] as const;

  const benchmarkSources = getActiveBenchmarkSources();

  return (
    <ReportSectionFrame
      eyebrow="Metodologia"
      title="Como este relatório foi feito"
      subtitle="Três fontes públicas complementam a leitura — recolha pública, referência de mercado e leitura editorial — apoiadas por sinais de pesquisa."
      tone="calm"
      spacing="tight"
      ariaLabel="Metodologia e fontes de dados"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {sources.map(({ icon: Icon, label, body }) => (
          <div
            key={label}
            className={`${REDESIGN_TOKENS.card} p-4 md:p-5 space-y-2 min-w-0`}
          >
            <div className="flex items-center gap-2 text-blue-600">
              <Icon className="size-4" aria-hidden="true" />
              <p className="text-eyebrow-sm text-content-tertiary">
                {label}
              </p>
            </div>
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
          <p className="text-eyebrow-sm text-content-tertiary">
            Dataset {BENCHMARK_DATASET_VERSION}
          </p>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {benchmarkSources.map((source) => {
            // Apenas qualidade `medium` recebe chip; `high` é o caso
            // silencioso por omissão. Fontes `low` ficam fora da lista
            // activa (filtradas por visibility=active).
            const showQualityChip = source.referenceQuality === "medium";
            return (
              <li
                key={source.name}
                className="flex items-start gap-3 rounded-lg border border-border-default/70 bg-white px-3 py-2.5 min-w-0"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                >
                  <BookOpenSmall />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm text-content-primary leading-tight">
                    <span className="font-medium">{source.name}</span>
                    <span className="ml-1.5 tabular-nums text-xs text-content-tertiary tabular-nums">
                      {source.publishedYear}
                    </span>
                  </p>
                  <p className="text-[12px] text-content-secondary leading-snug">
                    {source.shortDescription}
                  </p>
                  {showQualityChip ? (
                    <span
                      className={cn(
                        "text-eyebrow-sm mt-1 inline-block rounded-full px-1.5 py-0.5 ring-1",
                        "bg-surface-muted text-content-tertiary ring-border-default",
                      )}
                    >
                      Qualidade média
                    </span>
                  ) : null}
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
            );
          })}
        </ul>
        <p className="mt-3 text-[11.5px] text-content-tertiary leading-relaxed italic">
          Databox fica reservado para futura ligação autenticada — métricas privadas como alcance, visitas e cliques.
        </p>
      </div>
    </ReportSectionFrame>
  );
}

/** Pequeno ícone livro/marca-fonte alinhado com o tom indigo de `external`. */
function BookOpenSmall() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}