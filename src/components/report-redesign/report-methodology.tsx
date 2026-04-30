import { Database, LineChart, Sparkles, Search, ExternalLink, Users } from "lucide-react";
import { ReportSectionFrame } from "./report-section-frame";
import { REDESIGN_TOKENS } from "./report-tokens";
import type { ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import { ReportSourceLabel, type ReportSourceType } from "./v2/report-source-label";
import {
  INSTAGRAM_BENCHMARK_CONTEXT,
  BENCHMARK_DATASET_VERSION,
} from "@/lib/knowledge/benchmark-context";
import { cn } from "@/lib/utils";

interface Props {
  enriched?: ReportEnriched;
}

/**
 * Metodologia humana, não-técnica. Grid de 4 fontes seguida (opcional)
 * pela linha fina de proveniência do dataset de benchmark, unificando
 * o que antes vivia em dois blocos separados.
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
      body: "Dataset interno versionado de perfis pares, usado para contextualizar envolvimento e formato dominante.",
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

  const benchmarkSource = enriched?.benchmarkSource ?? null;

  const sourceLegend: Array<{ type: ReportSourceType; explanation: string }> = [
    { type: "extracted", explanation: "Recolhido directamente do perfil público de Instagram." },
    { type: "calculation", explanation: "Métrica calculada pela InstaBench a partir dos dados recolhidos." },
    { type: "automatic", explanation: "Classificação por regras determinísticas — sem IA." },
    { type: "ai", explanation: "Texto interpretativo gerado por modelo de linguagem." },
    { type: "external", explanation: "Comparação com a Knowledge Base de pares e benchmarks." },
  ];

  const benchmarkSources = INSTAGRAM_BENCHMARK_CONTEXT.sources.filter(
    (s) => s.uiDisplayAllowed,
  );

  return (
    <ReportSectionFrame
      eyebrow="Metodologia"
      title="Como este relatório foi feito"
      subtitle="Quatro fontes complementam-se para dar uma leitura honesta — recolha pública, referência de mercado, leitura editorial e sinais de pesquisa."
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
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                {label}
              </p>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {body}
            </p>
          </div>
        ))}
      </div>

      {benchmarkSource ? (
        <div className="mt-5 md:mt-6 pt-4 md:pt-5 border-t border-slate-200/70">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Fonte do benchmark
            {benchmarkSource.datasetVersion ? (
              <>
                <span className="mx-2 text-slate-400">·</span>
                <span>dataset {benchmarkSource.datasetVersion}</span>
              </>
            ) : null}
          </p>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
            {benchmarkSource.note}
          </p>
        </div>
      ) : null}

      <div className="mt-5 md:mt-6 pt-4 md:pt-5 border-t border-slate-200/70">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 mb-3">
          Como ler os cartões
        </p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {sourceLegend.map(({ type, explanation }) => (
            <li key={type} className="space-y-1.5 min-w-0">
              <ReportSourceLabel type={type} />
              <p className="text-[12px] text-slate-600 leading-snug">
                {explanation}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] text-slate-500 leading-relaxed">
          Estas referências usam estudos públicos de mercado para dar contexto aos resultados. Quando não há setor definido, a comparação é feita por plataforma e dimensão aproximada da conta.
        </p>
      </div>

      <div className="mt-5 md:mt-6 pt-4 md:pt-5 border-t border-slate-200/70">
        <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
            Fontes de referência
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
            Dataset {BENCHMARK_DATASET_VERSION}
          </p>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {benchmarkSources.map((source) => {
            const showQualityChip = source.referenceQuality !== "high";
            const qualityLabel =
              source.referenceQuality === "medium"
                ? "Qualidade média"
                : "Inspiração futura";
            return (
              <li
                key={source.name}
                className="flex items-start gap-3 rounded-lg border border-slate-200/70 bg-white px-3 py-2.5 min-w-0"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                >
                  <BookOpenSmall />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="text-sm text-slate-800 leading-tight">
                    <span className="font-medium">{source.name}</span>
                    <span className="ml-1.5 font-mono text-[10px] text-slate-400 tabular-nums">
                      {source.publishedYear}
                    </span>
                  </p>
                  <p className="text-[12px] text-slate-600 leading-snug">
                    {source.shortDescription}
                  </p>
                  {showQualityChip ? (
                    <span
                      className={cn(
                        "mt-1 inline-block font-mono text-[9px] uppercase tracking-[0.14em] rounded-full px-1.5 py-0.5 ring-1",
                        source.referenceQuality === "medium"
                          ? "bg-slate-50 text-slate-500 ring-slate-200"
                          : "bg-amber-50 text-amber-700 ring-amber-200",
                      )}
                    >
                      {qualityLabel}
                    </span>
                  ) : null}
                </div>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Abrir página da ${source.name} numa nova aba`}
                  className="shrink-0 inline-flex size-7 items-center justify-center rounded-md text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                >
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-5 md:mt-6 pt-4 md:pt-5 border-t border-slate-200/70">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-200"
          >
            <Users className="size-3.5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
              Comparação direta com concorrentes
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              Disponível no plano Pro: adicionar perfis concorrentes para
              comparar este perfil com contas reais do mesmo mercado. Diferente
              da referência de mercado — passa a usar dados de perfis específicos
              em vez de estudos agregados.
            </p>
            <button
              type="button"
              disabled
              title="Disponível no plano Pro"
              aria-label="Adicionar concorrente — disponível no plano Pro"
              className={cn(
                "mt-1 inline-flex items-center gap-2 rounded-full px-3 py-1.5",
                "border border-slate-200 bg-white text-[12px] text-slate-500",
                "cursor-not-allowed",
              )}
            >
              <span>Adicionar concorrente</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-blue-600 bg-blue-50 ring-1 ring-blue-200 rounded-full px-1.5 py-0.5">
                Pro
              </span>
            </button>
          </div>
        </div>
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