import { Database, LineChart, Sparkles, Search } from "lucide-react";
import { ReportSectionFrame } from "./report-section-frame";
import { REDESIGN_TOKENS } from "./report-tokens";

/**
 * Metodologia humana, não-técnica. Card único com 4 fontes.
 */
export function ReportMethodology() {
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
    </ReportSectionFrame>
  );
}