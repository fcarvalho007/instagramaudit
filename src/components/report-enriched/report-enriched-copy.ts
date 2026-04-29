/**
 * Copy editorial pt-PT (Acordo pós-90) para os companion blocks que
 * enriquecem `/analyze/$username` com dados já presentes no snapshot.
 * Nunca usado em `/report/example`.
 */

export const ENRICHED_COPY = {
  bio: {
    eyebrow: "Perfil",
    profileLinkLabel: "Ver no Instagram",
  },
  benchmarkSource: {
    eyebrow: "Fonte e metodologia",
    datasetPrefix: "Dataset",
  },
  topLinks: {
    eyebrow: "Top 5 publicações",
    title: "Abrir publicações no Instagram",
    subtitle:
      "Aceder diretamente às publicações com melhor envolvimento na amostra recolhida.",
    linkLabel: "Abrir no Instagram",
  },
  mentions: {
    eyebrow: "Menções detetadas",
    title: "Marcas e perfis mencionados",
    subtitle:
      "Contas referenciadas nas captions das publicações analisadas. Útil para mapear parcerias, comunidade e ecossistema do perfil.",
  },
  competitorsCta: {
    eyebrow: "Comparação com concorrentes",
    title: "Adicionar concorrentes para comparação",
    body:
      "A comparação com perfis concorrentes mostra contraste de envolvimento, formato dominante e ritmo de publicação. Adiciona até 2 concorrentes para ativar esta secção.",
    cta: "Adicionar concorrentes",
  },
  aiInsights: {
    eyebrow: "Detalhe da leitura por IA",
    title: "Sinais citados e nível de confiança",
    subtitle:
      "Para cada insight, o modelo declara os sinais do snapshot que utilizou e o respetivo nível de confiança. Útil para auditar a leitura editorial.",
    confidenceLabel: "Confiança",
    evidenceLabel: "Sinais",
    modelPrefix: "Modelo",
    generatedPrefix: "Gerado em",
  },
  aiInsightsFooter: {
    helpLine:
      "Cada leitura indica o nível de certeza do modelo e os indicadores do relatório que sustentam a conclusão.",
    summaryPrefix: "Confiança média",
    signalsPrefix: "sinais citados",
    detailsLabel: "Ver detalhe por insight",
  },
  glossary: {
    eyebrow: "Como ler este relatório",
    items: [
      {
        term: "Engajamento",
        definition:
          "Média de interações por publicação a dividir pelo número de seguidores.",
      },
      {
        term: "Benchmark",
        definition:
          "Mediana do dataset comparável, com idioma e dimensão semelhantes.",
      },
      {
        term: "Sinais",
        definition:
          "Indicadores do snapshot que sustentam cada leitura editorial gerada por IA.",
      },
    ] as const,
  },
} as const;
