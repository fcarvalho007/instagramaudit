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

export const EDITORIAL_V2_SECTIONS: readonly EditorialSectionMeta[] = [
  {
    id: "visao-geral",
    displayNumber: "01",
    title: "Visão geral",
    subtitle:
      "O que os dados desta janela dizem sobre o perfil, antes de entrar em cada métrica.",
  },
];
