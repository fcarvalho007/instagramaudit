/**
 * Configuração estática dos 6 blocos da Phase 1A.
 * Fonte única de verdade para IDs, eyebrows, perguntas humanas
 * e subtítulos — usada por nav lateral, tabs mobile e block-shell.
 */

export interface BlockConfig {
  id: string;
  number: string;
  shortLabel: string;
  question: string;
  subtitle: string;
}

export const BLOCKS: readonly BlockConfig[] = [
  {
    id: "overview",
    number: "01",
    shortLabel: "Overview",
    question: "Como está o perfil em geral?",
    subtitle:
      "Identidade do perfil, indicadores principais e enquadramento do que este relatório mostra.",
  },
  {
    id: "diagnostico",
    number: "02",
    shortLabel: "Diagnóstico",
    question: "O que explica estes resultados?",
    subtitle:
      "Leitura editorial e padrões cruzados que ajudam a interpretar o desempenho observado.",
  },
  {
    id: "performance",
    number: "03",
    shortLabel: "Performance",
    question: "Quando e como reage o público?",
    subtitle:
      "Evolução ao longo do tempo, ritmo de publicação e melhores momentos para chegar à audiência.",
  },
  {
    id: "conteudo",
    number: "04",
    shortLabel: "Conteúdo",
    question: "Que conteúdos têm melhor performance?",
    subtitle:
      "Publicações com mais retorno, mistura de formatos e padrões de linguagem editorial.",
  },
  {
    id: "procura",
    number: "05",
    shortLabel: "Procura",
    question: "Há procura real por estes temas fora da plataforma?",
    subtitle:
      "Sinais de procura externa que ajudam a perceber se os mesmos temas têm interesse em pesquisa.",
  },
  {
    id: "benchmark",
    number: "06",
    shortLabel: "Benchmark",
    question: "Como se compara com perfis semelhantes?",
    subtitle:
      "Posição face a referências de mercado e a perfis pares quando disponíveis.",
  },
] as const;
