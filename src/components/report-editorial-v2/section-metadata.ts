/**
 * Metadados APENAS de apresentação para o Editorial V2.
 *
 * Os identificadores funcionais de produção (featureKey, tiers, slugs de
 * âncora) não são renomeados nem duplicados aqui. Este ficheiro só define
 * a ordem editorial e os rótulos visuais desta variante.
 *
 * `displayNumber` é um rótulo — nunca uma chave.
 */

export interface EditorialSectionMeta {
  /** Slug de apresentação, usado apenas para âncora/heading id. */
  id: string;
  /** Rótulo visual, ex. "01". Nunca usado como chave funcional. */
  displayNumber: string;
  title: string;
  subtitle?: string;
}

/**
 * Sequência editorial própria do Editorial V2 (00 → 07). Os números são
 * rótulos de apresentação desta camada e NÃO espelham a numeração da
 * sidebar de produção (`COMMERCIAL_SECTIONS`), que se mantém intacta.
 *
 * Escala de referência para as migrações seguintes:
 *   00 Visão geral · 01 Engagement · 02 Frequência editorial ·
 *   03 Mix de formatos · 04 Publicações-chave · 05 Conversas ·
 *   06 Diagnóstico editorial · 07 Prioridades de acção.
 * Não existe secção 08.
 */
export const EDITORIAL_V2_DISPLAY_NUMBERS: Readonly<Record<string, string>> = {
  "visao-geral": "00",
  engagement: "01",
  frequencia: "02",
  formatos: "03",
  "publicacoes-chave": "04",
  conversas: "05",
  "diagnostico-editorial": "06",
  prioridades: "07",
};

export const EDITORIAL_V2_SECTIONS: readonly EditorialSectionMeta[] = [
  {
    id: "visao-geral",
    displayNumber: EDITORIAL_V2_DISPLAY_NUMBERS["visao-geral"]!,
    title: "Visão geral",
    subtitle:
      "O que os dados desta janela dizem sobre o perfil, antes de entrar em cada métrica.",
  },
];

/**
 * Secções Pro públicas, tal como confirmadas em `COMMERCIAL_SECTIONS`
 * (`block-config.ts`): apenas `diagnostico-editorial` e `prioridades`.
 * Os ids são os de produção; os números seguem a sequência editorial.
 */
export const EDITORIAL_V2_PRO_SECTIONS: readonly EditorialSectionMeta[] = [
  {
    id: "diagnostico-editorial",
    displayNumber: EDITORIAL_V2_DISPLAY_NUMBERS["diagnostico-editorial"]!,
    title: "Diagnóstico editorial",
    subtitle:
      "Propõe as causas mais prováveis dos resultados observados e identifica os sinais que os podem explicar.",
  },
  {
    id: "prioridades",
    displayNumber: EDITORIAL_V2_DISPLAY_NUMBERS["prioridades"]!,
    title: "Prioridades de acção",
    subtitle:
      "Transforma os dados num plano de prioridades para as próximas semanas: o que testar, corrigir ou repetir.",
  },
] as const;

