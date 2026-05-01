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

/**
 * Versão do dataset estático. Incrementar (formato `YYYY-MM-DD`) sempre
 * que `INSTAGRAM_BENCHMARK_CONTEXT` for actualizado. Entra no
 * `kbVersion` do orquestrador para invalidar cache de insights v2.
 */
export const BENCHMARK_DATASET_VERSION = "2026-05-08" as const;

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
  /**
   * URL canónico da fonte. Só renderizado na secção "Fontes de referência"
   * dentro de `ReportMethodology` — nunca no corpo dos cartões. Sempre
   * `target="_blank" rel="noopener noreferrer"`.
   */
  url: string;
  /** Ano da publicação/versão de referência mais recente que usamos. */
  publishedYear: number;
  /** Descrição curta pt-PT (≤80 chars) para a lista da metodologia. */
  shortDescription: string;
  /**
   * Qualidade editorial da referência. Usada para decidir, no futuro,
   * intervalos de mercado ou desempate entre estudos. Hoje só é
   * apresentada como chip discreto em `medium`/`low` na metodologia.
   */
  referenceQuality: "high" | "medium" | "low";
  /**
   * Visibilidade editorial da fonte no relatório actual.
   *  - `active`: fonte aprovada para citação visível no relatório público.
   *  - `future`: reservada para futura ligação autenticada (Databox).
   *    NÃO citar como fonte visível enquanto não houver dados privados
   *    (alcance, visitas, cliques, saves) no perfil analisado.
   */
  visibility: "active" | "future";
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
      url: "https://www.socialinsider.io/social-media-benchmarks/instagram",
      publishedYear: 2025,
      shortDescription:
        "Estudo agregado de envolvimento orgânico e desempenho por formato.",
      referenceQuality: "high",
      visibility: "active",
    },
    {
      name: "Buffer",
      role: "Follower-tier benchmark context",
      uiDisplayAllowed: true,
      linksAllowedInReport: false,
      url: "https://buffer.com/insights/instagram-benchmarks",
      publishedYear: 2025,
      shortDescription:
        "Benchmarks por dimensão da conta — cadência, envolvimento e crescimento.",
      referenceQuality: "high",
      visibility: "active",
    },
    {
      name: "Hootsuite",
      role: "Industry benchmark context and strategic interpretation",
      uiDisplayAllowed: true,
      linksAllowedInReport: false,
      url: "https://blog.hootsuite.com/social-media-benchmarks/",
      publishedYear: 2025,
      shortDescription:
        "Contexto cross-indústria e comparação entre plataformas.",
      referenceQuality: "medium",
      visibility: "active",
    },
    {
      name: "Databox",
      role: "Future authenticated dashboard benchmark inspiration",
      uiDisplayAllowed: false,
      linksAllowedInReport: false,
      url: "https://databox.com/benchmarks/instagram-benchmarks",
      publishedYear: 2025,
      shortDescription:
        "Inspiração para futura ligação autenticada — métricas privadas.",
      referenceQuality: "low",
      visibility: "future",
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
      "Fontes de enquadramento: Socialinsider, Buffer e Hootsuite.",
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
    macroTierNote:
      "Conta com 1M ou mais seguidores: a referência Buffer 500K–1M é a mais próxima disponível, pelo que a leitura é puramente direcional.",
    aboveBufferRangeHint:
      "Perfil acima dos escalões públicos de referência usados nesta leitura.",
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

// ─── Tier bridge ────────────────────────────────────────────────────

/**
 * Mapeia tiers Buffer (escalões editoriais por seguidores) para os tiers
 * internos `BenchmarkTier` usados na tabela `knowledge_benchmarks`.
 *
 * Esta ponte garante coerência quando o relatório cruza dados Buffer
 * (cadência, crescimento) com a referência interna de envolvimento.
 */
export const BUFFER_TIER_TO_INTERNAL_TIER: Record<
  BufferFollowerTier["tier"],
  BenchmarkTier
> = {
  "0-1K": "nano",
  "1-5K": "nano",
  "5-10K": "micro",
  "10-50K": "micro",
  "50-100K": "mid",
  "100-500K": "mid",
  "500K-1M": "macro",
};

// ─── Helper de matching automático ──────────────────────────────────

/** Formato dominante reportado pelo perfil — normalizado para o vocabulário Socialinsider. */
export type ProfileDominantFormat =
  | "carousel"
  | "reel"
  | "image"
  | "unknown";

/** Normaliza qualquer rótulo de formato (PT/EN, singular/plural) para o vocabulário Socialinsider. */
export function normalizeDominantFormat(
  raw: string | null | undefined,
): ProfileDominantFormat {
  if (!raw) return "unknown";
  const v = raw.toLowerCase().trim();
  if (v.includes("carros") || v.includes("carousel") || v.includes("sidecar")) {
    return "carousel";
  }
  if (v.includes("reel") || v.includes("video")) return "reel";
  if (v.includes("imag") || v.includes("image") || v.includes("foto")) {
    return "image";
  }
  return "unknown";
}

export interface BenchmarkContextForProfileInput {
  followers: number;
  dominantFormat?: ProfileDominantFormat | null;
  industry?: HootsuiteIndustry | null;
  /**
   * `true` apenas se o snapshot do perfil já contiver alcance real.
   * Quando `false` (padrão), o reach do Buffer NUNCA é exposto ao UI.
   */
  hasReachData?: boolean;
}

export interface BenchmarkContextForProfile {
  bufferTier: BufferFollowerTier | null;
  /** Mapeamento Buffer → tier interno (para cruzar com knowledge_benchmarks). */
  internalTier: BenchmarkTier | null;
  socialinsiderOverall: SocialinsiderEngagementEntry;
  socialinsiderForFormat: SocialinsiderEngagementEntry | null;
  hootsuite: HootsuiteIndustryEntry | null;
  /** Reach de referência. `null` se `hasReachData=false` (regra anti-invenção). */
  referenceReachPerPost: number | null;
  copyHints: {
    engagement: string;
    frequency: string;
    format: string;
    benchmarkNote: string;
    sourceNote: string;
    /** Preenchido apenas para perfis ≥1M (fora dos tiers Buffer). */
    tierNote: string;
  };
}

/**
 * Helper único de matching de contexto. Consumido pelo UI (Bloco 01 e
 * Bloco 02) e pela camada de prompt — garante que a mesma lógica de
 * elegibilidade é aplicada em todo o lado.
 */
export function getBenchmarkContextForProfile(
  input: BenchmarkContextForProfileInput,
): BenchmarkContextForProfile {
  const { followers, dominantFormat, industry, hasReachData = false } = input;

  const bufferTier = getBufferTierForFollowers(followers);
  // Fallback macro: perfis ≥1M ficam fora dos tiers Buffer mas devem
  // ainda mapear para o tier interno "macro" para efeitos de KB.
  const isAboveBufferRange = Number.isFinite(followers) && followers >= 1_000_000;
  const internalTier: BenchmarkTier | null = bufferTier
    ? BUFFER_TIER_TO_INTERNAL_TIER[bufferTier.tier]
    : isAboveBufferRange
      ? "macro"
      : null;

  const overall = getSocialinsiderEngagementForFormat("overall")!;
  const forFormat =
    dominantFormat && dominantFormat !== "unknown"
      ? getSocialinsiderEngagementForFormat(dominantFormat)
      : null;

  const hootsuite = getHootsuiteBenchmarkForIndustry(industry ?? null);

  const referenceReachPerPost =
    hasReachData && bufferTier ? bufferTier.medianReachPerPost : null;

  const copy = INSTAGRAM_BENCHMARK_CONTEXT.visibleCopyRulesPt;
  const formatCopy =
    dominantFormat === "carousel"
      ? copy.carouselExplanation
      : dominantFormat === "reel"
        ? copy.reelsExplanation
        : dominantFormat === "image"
          ? copy.imageExplanation
          : "";

  return {
    bufferTier,
    internalTier,
    socialinsiderOverall: overall,
    socialinsiderForFormat: forFormat,
    hootsuite,
    referenceReachPerPost,
    copyHints: {
      engagement: copy.engagementExplanation,
      frequency: copy.postingFrequencyExplanation,
      format: formatCopy,
      benchmarkNote: copy.benchmarkNote,
      sourceNote: copy.sourceNote,
      tierNote: isAboveBufferRange ? copy.aboveBufferRangeHint : "",
    },
  };
}

// ─── Serializer compacto para o prompt OpenAI ───────────────────────

/** Formata um número com 1-2 casas decimais conforme magnitude. */
function fmtPct(n: number): string {
  return n >= 10 ? n.toFixed(1) : n.toFixed(2);
}

/**
 * Serializa o contexto de benchmark do perfil para um bloco compacto
 * pronto a colar no system prompt do OpenAI.
 *
 * Princípios:
 *  - ≤ ~12 linhas; formato chave-valor curto.
 *  - Não cita marcas (Socialinsider, Buffer, Hootsuite, Databox).
 *  - Omite reach quando `hasReachData=false` (regra anti-invenção).
 *  - Linguagem direccional (referência, contexto, mediano).
 */
export function formatBenchmarkContextForPrompt(
  input: BenchmarkContextForProfileInput,
): string {
  const ctx = getBenchmarkContextForProfile(input);
  const lines: string[] = [];
  lines.push("REFERÊNCIAS DIRECIONAIS (uso interno, não citar fontes nem marcas):");

  // Tier por seguidores
  if (ctx.bufferTier) {
    const t = ctx.bufferTier;
    const reachPart =
      input.hasReachData && t.medianReachPerPost
        ? ` · alcance mediano ref.: ${t.medianReachPerPost}`
        : "";
    lines.push(
      `- Tier por seguidores: ${t.tier} · ER mediana ref.: ${fmtPct(t.medianEngagementRatePct)}% · cadência ref.: ${t.postsPerMonth} posts/mês · crescimento ref.: ${t.monthlyFollowerGrowthPct >= 0 ? "+" : ""}${fmtPct(t.monthlyFollowerGrowthPct)}%/mês${reachPart}`,
    );
  } else if (input.followers >= 1_000_000) {
    lines.push(
      "- Tier por seguidores: ≥1M, sem referência directa; usar tier 500K-1M apenas como direccional.",
    );
  } else {
    lines.push("- Tier por seguidores: indisponível para este perfil.");
  }

  // ER por formato (orgânico, contexto geral)
  const si = INSTAGRAM_BENCHMARK_CONTEXT.socialinsider.organicEngagementRateByFormat;
  const get = (f: SocialinsiderFormat) =>
    si.find((e) => e.format === f)?.engagementRatePct ?? 0;
  lines.push(
    `- ER por formato (orgânico, contexto geral): geral ${fmtPct(get("overall"))}% · carrossel ${fmtPct(get("carousel"))}% · reel ${fmtPct(get("reel"))}% · imagem ${fmtPct(get("image"))}%`,
  );

  // Indústria
  if (ctx.hootsuite) {
    lines.push(
      `- Indústria: ER carrossel ref.: ${fmtPct(ctx.hootsuite.carouselEngagementRatePct)}% · melhor formato sugerido: ${ctx.hootsuite.bestInstagramFormat}.`,
    );
  } else {
    lines.push("- Indústria: n/a (não fornecida pelo perfil).");
  }

  // Formato dominante do perfil cruzado com referência
  if (ctx.socialinsiderForFormat) {
    lines.push(
      `- Formato dominante do perfil: ${ctx.socialinsiderForFormat.format} · referência geral: ${fmtPct(ctx.socialinsiderForFormat.engagementRatePct)}%.`,
    );
  } else {
    lines.push("- Formato dominante do perfil: indeterminado; usar referência geral.");
  }

  // 2 princípios estratégicos curtos (sempre os mesmos — neutros e seguros)
  lines.push("- Princípio: optimizar interacção (gostos, comentários, guardados implícitos), não apenas alcance.");
  lines.push("- Princípio: carrosséis fortes para autoridade/educação; reels para descoberta; imagens para identidade e produto.");

  return lines.join("\n");
}

/**
 * Lista as fontes editoriais activas no relatório público (i.e. as que
 * podem ser citadas pelo nome em chips/UI). Exclui Databox enquanto
 * estiver reservada para futura ligação autenticada. Helper único
 * reutilizável por `ReportMethodology` e qualquer futuro componente.
 */
export function getActiveBenchmarkSources(): ReadonlyArray<BenchmarkSource> {
  return INSTAGRAM_BENCHMARK_CONTEXT.sources.filter(
    (s) => s.visibility === "active",
  );
}

// ─── Consolidated benchmark tier series ─────────────────────────────

/**
 * Ponto de referência consolidado por escalão de seguidores.
 * Usado pelo gráfico de barras do Benchmark Gap Card (Block 01).
 * Valores derivados dos tiers Buffer existentes — nunca hardcoded.
 */
export interface BenchmarkTierPoint {
  tierLabel: string;
  minFollowers: number;
  maxFollowers: number | null;
  engagementRatePct: number;
  sourceLabel: string;
  sourceUrl?: string;
}

/**
 * Série editorial canónica de envolvimento por escalão de seguidores.
 * Valores consolidados a partir de Buffer, Socialinsider e Hootsuite.
 * Guardados na KB como referência direcional — não hardcoded no componente.
 */
export function getConsolidatedBenchmarkSeries(): BenchmarkTierPoint[] {
  const sourceLabel = "Buffer · Socialinsider";
  return [
    {
      tierLabel: "1K–5K",
      minFollowers: 1_000,
      maxFollowers: 5_000,
      engagementRatePct: 6.08,
      sourceLabel,
    },
    {
      tierLabel: "5K–20K",
      minFollowers: 5_000,
      maxFollowers: 20_000,
      engagementRatePct: 4.80,
      sourceLabel,
    },
    {
      tierLabel: "20K–100K",
      minFollowers: 20_000,
      maxFollowers: 100_000,
      engagementRatePct: 5.10,
      sourceLabel,
    },
    {
      tierLabel: "100K–1M",
      minFollowers: 100_000,
      maxFollowers: 1_000_000,
      engagementRatePct: 3.78,
      sourceLabel,
    },
    {
      tierLabel: "+1M",
      minFollowers: 1_000_000,
      maxFollowers: null,
      engagementRatePct: 2.66,
      sourceLabel,
    },
  ];
}

/**
 * Determina o índice do escalão activo para um dado número de seguidores.
 * Retorna o último índice se estiver acima de todos os escalões.
 */
export function getActiveTierIndex(
  followers: number,
  series: readonly BenchmarkTierPoint[],
): number {
  for (let i = 0; i < series.length; i++) {
    const t = series[i];
    if (t.maxFollowers === null || followers < t.maxFollowers) return i;
  }
  return series.length - 1;
}
