import { Database, LineChart, Sparkles, Search } from "lucide-react";
import { ReportSectionFrame } from "./report-section-frame";
import { REDESIGN_TOKENS } from "./report-tokens";
import type { ReportEnriched } from "@/lib/report/snapshot-to-report-data";
import { ReportSourceLabel, type ReportSourceType } from "./v2/report-source-label";

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
      </div>
    </ReportSectionFrame>
  );
}