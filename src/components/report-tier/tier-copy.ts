/**
 * Single source of truth for the Free vs Paid editorial copy used inside the
 * real `/analyze/$username` report. Keeping the strings here lets us iterate
 * on tone without touching the locked `report-*` components.
 *
 * Language: European Portuguese (Acordo Ortográfico pós-1990).
 */

export const TIER_COPY = {
  scope: {
    eyebrow: "Acesso beta · visão essencial",
    title: "Relatório gratuito durante a fase beta",
    body: "Este relatório combina dados públicos do Instagram, sinais de pesquisa e leitura assistida por IA. Durante o lançamento, mostramos uma leitura alargada sem pagamento. A versão Pro aprofundará concorrentes, pesquisa e plano de ação.",
  },
  comparison: {
    eyebrow: "Próximo nível",
    title: "O que muda no relatório completo",
    subtitle: "Do diagnóstico rápido à leitura estratégica.",
    columns: {
      essential: {
        tag: "Visão essencial",
        heading: "Incluído no gratuito",
        items: [
          "Resumo do perfil e métricas principais",
          "Benchmark de envolvimento por escalão",
          "Top publicações e padrão de conteúdo",
          "1 sinal de mercado de pesquisa",
          "3 insights estratégicos curtos",
        ],
      },
      complete: {
        tag: "Leitura completa",
        heading: "Disponível no relatório completo",
        items: [
          "Comparação com até 2 concorrentes",
          "Gap competitivo por formato e dia",
          "Keywords de oportunidade e SERP do Google",
          "Cruzamento Instagram × Pesquisa",
          "Recomendações prioritárias e plano de 30 dias",
          "Exportação em PDF (em breve)",
        ],
      },
    },
    closing:
      "O gratuito mostra o que está a acontecer. O completo mostra porquê, contra quem e o que fazer a seguir.",
  },
  tag: {
    essential: "Visão essencial",
    complete: "Disponível no relatório completo",
  },
} as const;