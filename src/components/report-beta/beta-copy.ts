/**
 * Copy editorial para o posicionamento beta e bloco de feedback no relatório
 * público (`/analyze/$username`). Não afeta `/report/example`.
 *
 * Língua: Português europeu (Acordo Ortográfico pós-1990).
 */

export const BETA_COPY = {
  strip: {
    eyebrow: "Acesso beta gratuito",
    title: "Relatório completo disponível durante a fase beta",
    body:
      "Durante o lançamento, este relatório mostra uma leitura alargada sem pagamento. No futuro, algumas análises avançadas — concorrentes, pesquisa, recomendações e exportação — poderão fazer parte da versão Pro.",
  },
  feedback: {
    title: "Este relatório foi útil?",
    subtitle:
      "O InstaBench está em fase beta. O teu feedback ajuda-nos a tornar a análise mais útil para marcas, criadores e equipas de marketing.",
    actions: {
      feedback: { label: "Dar feedback", href: "#" },
      pro: { label: "Quero acesso Pro", href: "#" },
      share: { label: "Partilhar no LinkedIn" },
    },
    note: "Sem compromisso. O objetivo é melhorar o produto com utilizadores reais.",
  },
} as const;