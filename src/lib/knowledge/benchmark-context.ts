/**
 * Instagram Benchmark Context — dataset editorial canónico.
 *
 * Fonte de verdade estática para o contexto de mercado usado pelo
 * relatório do InstaBench. Espelha (em forma de constantes) a política
 * descrita em `KNOWLEDGE.md` e na `KnowledgeNote` "Política de fontes
 * de benchmark".
 *
 * Regras de uso:
 *  - Os nomes das fontes podem ser apresentados no UI; URLs nunca.
 *  - Nada aqui dentro deve ser apresentado como métrica do perfil
 *    analisado — é sempre **referência direcional**.
 *  - Métricas que requerem acesso autenticado (alcance, visitas,
 *    cliques) só podem aparecer no relatório se existirem no dataset
 *    real do perfil. Caso contrário ficam como contexto interno.
 *
 * Este módulo é neutro (sem `*.server.ts`) — pode ser importado tanto
 * pela camada de orquestração de insights como por componentes UI.
 */

import type { BenchmarkTier } from "./types";

export type BenchmarkSourceName =
  | "Socialinsider"
  | "Buffer"
  | "Hootsuite"
  | "Databox";

export interface BenchmarkSource {
  name: BenchmarkSourceName;
  role: string;
  uiDisplayAllowed: boolean;
  linksAllowedInReport: boolean;
}

export type SocialinsiderFormat = "overall" | "carousel" | "reel" | "image";

export interface SocialinsiderEngagementEntry {
  format: SocialinsiderFormat;
  engagementRatePct: number;
  usage: string;
}

export interface SocialinsiderFrequencyEntry {
  format: Exclude<SocialinsiderFormat, "overall">;
  postsPerMonth: number;
}

export interface BufferFollowerTier {
  tier: "0-1K" | "1-5K" | "5-10K" | "10-50K" | "50-100K" | "100-500K" | "500K-1M";
  minFollowers: number;
  maxFollowers: number;
  monthlyFollowerGrowthPct: number;
  postsPerMonth: number;
  medianEngagementRatePct: number;
  /** Só pode ser exposto no UI se o perfil tiver dados reais de alcance. */
  medianReachPerPost: number;
  usage: string;
}

export type HootsuiteIndustry =
  | "education"
  | "entertainment_media"
  | "financial_services"
  | "hospitality_tourism"
  | "government"
  | "healthcare"
  | "professional_services"
  | "retail"
  | "construction_manufacturing"
  | "marketing_agencies"
  | "nonprofits"
  | "technology"
  | "utilities_energy";

export interface HootsuiteIndustryEntry {
  industry: HootsuiteIndustry;
  bestInstagramFormat: "carousel" | "reel" | "image";
  carouselEngagementRatePct: number;
}

export const INSTAGRAM_BENCHMARK_CONTEXT = {
  sources: [
    {
      name: "Socialinsider",
      role: "Organic Instagram context and format-level interpretation",
      uiDisplayAllowed: true,
      linksAllowedInReport: false,
    },
    {
      name: "Buffer",
      role: "Follower-tier benchmark context",
      uiDisplayAllowed: true,
      linksAllowedInReport: false,
    },
    {
      name: "Hootsuite",
      role: "Industry benchmark context and strategic interpretation",
      uiDisplayAllowed: true,
      linksAllowedInReport: false,
    },
    {
      name: "Databox",
      role: "Future authenticated dashboard benchmark inspiration",
      uiDisplayAllowed: true,
      linksAllowedInReport: false,
    },
  ] satisfies ReadonlyArray<BenchmarkSource>,

  socialinsider: {
    period: "2025 data / 2026 benchmark publication context",
    sampleNote: "Large-scale Instagram organic benchmark context",
    usage:
      "Use for directional context, not exact profile scoring unless methodology matches.",
    organicEngagementRateByFormat: [
      { format: "overall", engagementRatePct: 0.48, usage: "general organic Instagram context" },
      { format: "carousel", engagementRatePct: 0.55, usage: "format context; useful for educational and save-worthy content" },
      { format: "reel", engagementRatePct: 0.52, usage: "format context; useful for discovery and short-form video" },
      { format: "image", engagementRatePct: 0.37, usage: "format context; useful for static brand/product presence" },
    ] satisfies ReadonlyArray<SocialinsiderEngagementEntry>,
    postingFrequencyPerMonth: [
      { format: "reel", postsPerMonth: 8 },
      { format: "carousel", postsPerMonth: 5 },
      { format: "image", postsPerMonth: 7 },
    ] satisfies ReadonlyArray<SocialinsiderFrequencyEntry>,
    strategicPrinciples: [
      "Optimize for interaction, not visibility alone.",
      "Carousels are strong for authority, education, practical takeaways and save-worthy content.",
      "Reels help maintain reach and relevance but should not be treated as automatic virality.",
      "Static images should be used selectively for brand identity, products, events and visual consistency.",
      "Follower growth is harder to sustain as accounts grow.",
      "Surface engagement may decline while private engagement such as saves, shares and DMs becomes more important.",
    ] as const,
  },

  bufferFollowerTiers: [
    { tier: "0-1K", minFollowers: 0, maxFollowers: 1000, monthlyFollowerGrowthPct: 5.9, postsPerMonth: 14, medianEngagementRatePct: 4.7, medianReachPerPost: 34, usage: "Use engagement and posting frequency only if formula is compatible. Do not use reach unless real reach exists." },
    { tier: "1-5K", minFollowers: 1000, maxFollowers: 5000, monthlyFollowerGrowthPct: 3.1, postsPerMonth: 16, medianEngagementRatePct: 4.4, medianReachPerPost: 187, usage: "Use engagement and posting frequency only if formula is compatible. Do not use reach unless real reach exists." },
    { tier: "5-10K", minFollowers: 5000, maxFollowers: 10000, monthlyFollowerGrowthPct: 5.7, postsPerMonth: 20, medianEngagementRatePct: 3.9, medianReachPerPost: 469, usage: "Use engagement and posting frequency only if formula is compatible. Do not use reach unless real reach exists." },
    { tier: "10-50K", minFollowers: 10000, maxFollowers: 50000, monthlyFollowerGrowthPct: 2.0, postsPerMonth: 23, medianEngagementRatePct: 3.7, medianReachPerPost: 1172, usage: "Use engagement and posting frequency only if formula is compatible. Do not use reach unless real reach exists." },
    { tier: "50-100K", minFollowers: 50000, maxFollowers: 100000, monthlyFollowerGrowthPct: 1.4, postsPerMonth: 34, medianEngagementRatePct: 3.2, medianReachPerPost: 2803, usage: "Use engagement and posting frequency only if formula is compatible. Do not use reach unless real reach exists." },
    { tier: "100-500K", minFollowers: 100000, maxFollowers: 500000, monthlyFollowerGrowthPct: 2.7, postsPerMonth: 51, medianEngagementRatePct: 3.5, medianReachPerPost: 6480, usage: "Use engagement and posting frequency only if formula is compatible. Do not use reach unless real reach exists." },
    { tier: "500K-1M", minFollowers: 500000, maxFollowers: 1000000, monthlyFollowerGrowthPct: 1.0, postsPerMonth: 165, medianEngagementRatePct: 2.6, medianReachPerPost: 20737, usage: "Use engagement and posting frequency only if formula is compatible. Do not use reach unless real reach exists." },
  ] satisfies ReadonlyArray<BufferFollowerTier>,

  hootsuiteIndustryBenchmarks: {
    usage:
      "Use only if the profile has a known or user-selected industry. Otherwise, keep as future context.",
    overall: {
      bestInstagramFormat: "carousel" as const,
      carouselEngagementRatePct: 4.2,
      note: "Directional industry benchmark context only.",
    },
    industries: [
      { industry: "education", bestInstagramFormat: "carousel", carouselEngagementRatePct: 5.4 },
      { industry: "entertainment_media", bestInstagramFormat: "carousel", carouselEngagementRatePct: 3.2 },
      { industry: "financial_services", bestInstagramFormat: "carousel", carouselEngagementRatePct: 4.1 },
      { industry: "hospitality_tourism", bestInstagramFormat: "carousel", carouselEngagementRatePct: 3.7 },
      { industry: "government", bestInstagramFormat: "carousel", carouselEngagementRatePct: 5.0 },
      { industry: "healthcare", bestInstagramFormat: "carousel", carouselEngagementRatePct: 4.5 },
      { industry: "professional_services", bestInstagramFormat: "carousel", carouselEngagementRatePct: 4.1 },
      { industry: "retail", bestInstagramFormat: "carousel", carouselEngagementRatePct: 3.6 },
      { industry: "construction_manufacturing", bestInstagramFormat: "carousel", carouselEngagementRatePct: 5.2 },
      { industry: "marketing_agencies", bestInstagramFormat: "carousel", carouselEngagementRatePct: 3.7 },
      { industry: "nonprofits", bestInstagramFormat: "carousel", carouselEngagementRatePct: 5.5 },
      { industry: "technology", bestInstagramFormat: "carousel", carouselEngagementRatePct: 4.2 },
      { industry: "utilities_energy", bestInstagramFormat: "carousel", carouselEngagementRatePct: 5.5 },
    ] satisfies ReadonlyArray<HootsuiteIndustryEntry>,
  },

  databox: {
    usage:
      "Future authenticated analytics context only. Do not use in the current public-profile report unless real data exists.",
    unavailableForPublicScraping: [
      "profile visits",
      "reach",
      "website clicks",
      "new followers",
      "new following",
    ] as const,
    strategicUse: [
      "Inspiration for future authenticated dashboard.",
      "Potential future paid-tier metrics if Instagram account connection is added.",
    ] as const,
  },

  /**
   * Copy curto e canónico em pt-PT — pronto a ser consumido por
   * componentes do relatório (não traduzir, não inventar variantes).
   */
  visibleCopyRulesPt: {
    benchmarkNote:
      "Os benchmarks são referências direcionais. A leitura pode variar consoante dimensão da conta, setor, período analisado e método de cálculo.",
    sourceNote:
      "Contexto de referência: Socialinsider, Buffer, Hootsuite e Databox.",
    engagementExplanation:
      "A taxa de envolvimento compara gostos e comentários com a dimensão da audiência. É útil para leitura rápida, mas deve ser interpretada como referência direcional.",
    postingFrequencyExplanation:
      "A cadência mostra consistência, mas publicar mais não significa necessariamente gerar mais resposta. O essencial é cruzar volume, formato e reação da audiência.",
    carouselExplanation:
      "Carrosséis tendem a funcionar bem quando organizam conhecimento, checklists, ideias práticas ou conteúdos que merecem ser guardados.",
    reelsExplanation:
      "Reels ajudam na descoberta e no alcance, mas devem ser avaliados pela qualidade da resposta gerada, não apenas pela presença no calendário.",
    imageExplanation:
      "Imagens estáticas continuam úteis para produto, eventos, identidade visual e presença de marca, sobretudo quando fazem parte de uma narrativa consistente.",
  },
} as const;

// ─── Helpers ────────────────────────────────────────────────────────

/** Devolve o tier Buffer correspondente ao número de seguidores. */
export function getBufferTierForFollowers(
  followers: number,
): BufferFollowerTier | null {
  if (!Number.isFinite(followers) || followers < 0) return null;
  for (const tier of INSTAGRAM_BENCHMARK_CONTEXT.bufferFollowerTiers) {
    if (followers >= tier.minFollowers && followers < tier.maxFollowers) {
      return tier;
    }
  }
  // 1M+ não está coberto; devolve null (o relatório deve omitir comparação).
  return null;
}

/** Devolve a referência Socialinsider para um formato dado. */
export function getSocialinsiderEngagementForFormat(
  format: SocialinsiderFormat,
): SocialinsiderEngagementEntry | null {
  return (
    INSTAGRAM_BENCHMARK_CONTEXT.socialinsider.organicEngagementRateByFormat.find(
      (e) => e.format === format,
    ) ?? null
  );
}

/** Devolve o benchmark Hootsuite para uma indústria — só usar se houver indústria seleccionada. */
export function getHootsuiteBenchmarkForIndustry(
  industry: HootsuiteIndustry | null | undefined,
): HootsuiteIndustryEntry | null {
  if (!industry) return null;
  return (
    INSTAGRAM_BENCHMARK_CONTEXT.hootsuiteIndustryBenchmarks.industries.find(
      (e) => e.industry === industry,
    ) ?? null
  );
}
