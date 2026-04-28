/**
 * Deterministic, snapshot-only recommendation engine for the PDF report.
 *
 * Pure module — no I/O, no AI, no randomness, no Date.now.
 * Same input ⇒ identical output across runs.
 *
 * Editorial copy is European Portuguese (AO90), impersonal voice. Never
 * uses Brazilian forms ("você", "tela", "arquivo", etc.).
 */

import type { BenchmarkPositioning } from "@/lib/benchmark/types";

/** Narrow shape derived upstream in `render.ts` from the snapshot payload. */
export interface RecommendationInput {
  /** Average engagement rate of the analysed profile, in percent. */
  engagementPct: number;
  /** Estimated posts per week. */
  postsPerWeek: number;
  /** Canonical dominant format label. */
  dominantFormat: "Reels" | "Carrosséis" | "Imagens";
  /**
   * Per-format aggregates, keyed by canonical label. Values default to zero
   * when the snapshot did not include that format.
   */
  formats: Record<
    "Reels" | "Carrosséis" | "Imagens",
    { sharePct: number; avgEngagementPct: number }
  >;
  /** Top posts (already sorted by engagement desc upstream). May be empty. */
  topPosts: Array<{
    format: "Reels" | "Carrosséis" | "Imagens";
    captionLength: number;
  }>;
  /** Hashtag stats aggregated across analysed posts. */
  hashtags: {
    /** Total hashtag occurrences across all posts. */
    total: number;
    /** Unique hashtag count. */
    unique: number;
    /** Number of posts considered (denominator for averages). */
    postCount: number;
  };
  /** Median engagement % across competitors with a successful analysis. Null when none. */
  competitorMedianEngagementPct: number | null;
  /** Server-resolved benchmark positioning. May be unavailable. */
  benchmark: BenchmarkPositioning | undefined;
  /** Profile bio text (trimmed). May be empty. */
  bio: string;
}

export interface PdfRecommendation {
  id: string;
  title: string;
  body: string;
  /** Higher = more important. Used for stable ordering. */
  priority: number;
}

const FORMAT_ORDER: Array<"Reels" | "Carrosséis" | "Imagens"> = [
  "Reels",
  "Carrosséis",
  "Imagens",
];

function isAvailable(
  b: BenchmarkPositioning | undefined,
): b is Extract<BenchmarkPositioning, { status: "available" }> {
  return Boolean(b && b.status === "available");
}

/**
 * Returns the best-performing non-dominant format by `avgEngagementPct`.
 * Ties are broken by canonical name order so the result is stable.
 */
function pickAlternativeFormat(
  input: RecommendationInput,
): "Reels" | "Carrosséis" | "Imagens" | null {
  let best: { name: "Reels" | "Carrosséis" | "Imagens"; eng: number } | null =
    null;
  for (const name of FORMAT_ORDER) {
    if (name === input.dominantFormat) continue;
    const eng = input.formats[name]?.avgEngagementPct ?? 0;
    if (!best || eng > best.eng) {
      best = { name, eng };
    }
  }
  return best ? best.name : null;
}

function avgCaptionLength(
  posts: RecommendationInput["topPosts"],
): number {
  if (posts.length === 0) return 0;
  const total = posts.reduce((acc, p) => acc + p.captionLength, 0);
  return total / posts.length;
}

function topPostsShareFormat(
  posts: RecommendationInput["topPosts"],
): "Reels" | "Carrosséis" | "Imagens" | null {
  if (posts.length < 3) return null;
  const first = posts[0].format;
  for (let i = 1; i < Math.min(3, posts.length); i++) {
    if (posts[i].format !== first) return null;
  }
  return first;
}

/**
 * Pure heuristic engine. Returns 4–6 recommendations sorted by priority desc
 * (ties broken by id for determinism).
 */
export function buildRecommendations(
  input: RecommendationInput,
): PdfRecommendation[] {
  const out: PdfRecommendation[] = [];
  const b = input.benchmark;

  // — Benchmark-driven rules —
  if (isAvailable(b)) {
    if (b.differencePercent < -10) {
      out.push({
        id: "engagement_below_benchmark",
        title: "Reforçar ganchos e CTAs nos primeiros segundos",
        body:
          "O envolvimento do perfil está abaixo do benchmark do tier. Recomenda-se trabalhar ganchos visuais e textuais nos primeiros três segundos de cada peça e fechar com chamadas à ação claras (guardar, partilhar, comentar com uma palavra). Pequenas iterações na abertura tendem a produzir o ganho mais rápido.",
        priority: 90,
      });
    } else if (b.differencePercent > 10) {
      out.push({
        id: "engagement_above_benchmark",
        title: "Capitalizar a vantagem actual sobre o benchmark",
        body:
          "O envolvimento está acima do benchmark do tier. Vale a pena documentar internamente os elementos que estão a funcionar (formato, ângulo, cadência) e replicá-los de forma consistente no próximo ciclo editorial, em vez de mudar a fórmula.",
        priority: 60,
      });
    } else {
      out.push({
        id: "engagement_aligned",
        title: "Procurar o próximo salto de envolvimento",
        body:
          "O envolvimento está alinhado com o benchmark do tier. Para sair do plateau, recomenda-se testar deliberadamente um formato secundário durante quatro semanas, mantendo o formato dominante como base, e medir a diferença.",
        priority: 40,
      });
    }
  }

  // — Format concentration / underused high-performer —
  const dominant = input.formats[input.dominantFormat];
  const dominantShare = dominant?.sharePct ?? 0;
  const dominantEng = dominant?.avgEngagementPct ?? 0;

  if (dominantShare >= 70) {
    const alt = pickAlternativeFormat(input);
    if (alt) {
      out.push({
        id: "format_concentration_high",
        title: `Testar o formato ${alt} para diversificar a aposta`,
        body: `Mais de 70% das publicações analisadas concentram-se em ${input.dominantFormat}. A concentração elevada cria dependência de um único formato. Recomenda-se reservar uma a duas peças por mês ao formato ${alt} para validar se desbloqueia novas audiências sem comprometer a base actual.`,
        priority: 80,
      });
    }
  }

  for (const name of FORMAT_ORDER) {
    if (name === input.dominantFormat) continue;
    const f = input.formats[name];
    if (!f) continue;
    if (
      dominantEng > 0 &&
      f.avgEngagementPct >= dominantEng * 1.3 &&
      f.sharePct < 25
    ) {
      out.push({
        id: `format_underused_${name.toLowerCase()}`,
        title: `Reforçar o formato ${name} no calendário editorial`,
        body: `O formato ${name} apresenta envolvimento médio claramente superior ao formato dominante (${input.dominantFormat}), apesar de representar menos de um quarto das publicações. Recomenda-se aumentar gradualmente a frequência de ${name} e medir o impacto ao fim de quatro semanas.`,
        priority: 75,
      });
      break; // only the first qualifying format — keeps the list focused.
    }
  }

  // — Cadence —
  if (input.postsPerWeek < 2) {
    out.push({
      id: "cadence_low",
      title: "Estabelecer um ritmo semanal mínimo de publicação",
      body:
        "A frequência de publicação está abaixo de duas peças por semana. Para manter o algoritmo a recomendar o perfil de forma estável, recomenda-se um mínimo de três publicações semanais com calendário fixo, mesmo que parte seja conteúdo mais leve ou recombinado.",
      priority: 70,
    });
  } else if (
    input.postsPerWeek > 5 &&
    isAvailable(b) &&
    b.differencePercent < -10
  ) {
    out.push({
      id: "cadence_high_low_engagement",
      title: "Reduzir volume e investir em qualidade narrativa",
      body:
        "A cadência semanal é elevada mas o envolvimento por peça está abaixo do benchmark. Recomenda-se reduzir o volume em 30 a 40% durante um mês e investir o tempo libertado em guião, abertura e edição. O objectivo é elevar o envolvimento médio sem perder presença.",
      priority: 55,
    });
  }

  // — Top posts pillar / caption signal —
  const pillar = topPostsShareFormat(input.topPosts);
  if (pillar) {
    out.push({
      id: "top_posts_format_pillar",
      title: `Expandir o pilar editorial de ${pillar}`,
      body: `As três publicações com maior envolvimento partilham o formato ${pillar}. Esta concentração no topo é um sinal claro de pilar editorial. Recomenda-se desenhar três ângulos derivados (tutorial, opinião, bastidores) dentro do mesmo pilar para o próximo ciclo de quatro semanas.`,
      priority: 65,
    });
  }

  if (avgCaptionLength(input.topPosts) > 120) {
    out.push({
      id: "top_posts_caption_signal",
      title: "Manter narrativa estendida nas captions",
      body:
        "As publicações de topo apresentam captions médias acima de 120 caracteres, o que sugere que a audiência valoriza o desenvolvimento textual. Recomenda-se manter este formato e estruturar cada caption com gancho, desenvolvimento e chamada à acção, evitando regressar a captions curtas.",
      priority: 50,
    });
  }

  // — Hashtags —
  if (input.hashtags.postCount > 0) {
    const avgPerPost = input.hashtags.total / input.hashtags.postCount;
    if (avgPerPost < 3) {
      out.push({
        id: "hashtags_sparse",
        title: "Introduzir clusters de hashtags estruturados",
        body:
          "A média de hashtags por publicação é inferior a três, abaixo do que é razoável para alcance descoberto. Recomenda-se compor clusters de cinco a oito hashtags por peça, distribuídos entre marca, tema e nicho, mantendo consistência ao longo do mês.",
        priority: 55,
      });
    }
    if (
      input.hashtags.total > 0 &&
      input.hashtags.unique / input.hashtags.total < 0.4
    ) {
      out.push({
        id: "hashtags_repetitive",
        title: "Diversificar a rotação de hashtags",
        body:
          "A rotação de hashtags é repetitiva — o conjunto único representa menos de 40% do total usado. Esta repetição limita o alcance a audiências já familiarizadas. Recomenda-se manter um núcleo fixo de marca e rodar deliberadamente as hashtags de nicho a cada peça.",
        priority: 50,
      });
    }
  }

  // — Competitors —
  if (
    input.competitorMedianEngagementPct !== null &&
    input.engagementPct > 0 &&
    input.competitorMedianEngagementPct >= input.engagementPct * 1.25
  ) {
    out.push({
      id: "competitors_outperform",
      title: "Estudar formatos e cadência dos concorrentes",
      body:
        "A mediana de envolvimento dos concorrentes analisados é claramente superior à do perfil. Recomenda-se uma análise estruturada das peças mais envolventes destes perfis (ganchos, formato, duração) e replicar duas mecânicas-chave durante quatro semanas, medindo a diferença.",
      priority: 70,
    });
  }

  // — Bio —
  if (input.bio.trim().length < 40) {
    out.push({
      id: "bio_weak",
      title: "Reescrever a bio com proposta de valor clara",
      body:
        "A bio actual é curta ou genérica. A bio é o primeiro filtro de decisão para seguir o perfil. Recomenda-se uma estrutura curta e directa com proposta de valor, prova social ou nicho específico, e uma chamada à acção (link, próximo passo).",
      priority: 35,
    });
  }

  // — Fallback baseline rules (always available) —
  out.push({
    id: "consistency_baseline",
    title: "Manter consistência editorial e medição mensal",
    body:
      "Independentemente das alterações tácticas, recomenda-se manter um calendário editorial fixo e revisitar as métricas-chave (envolvimento, formato dominante, cadência) ao final de cada mês. A consistência ao longo de três meses produz o melhor sinal para ajustes estratégicos.",
    priority: 25,
  });

  out.push({
    id: "analytics_loop",
    title: "Fechar o ciclo de análise por formato",
    body:
      "Recomenda-se registar, a cada 30 dias, o envolvimento médio por formato e a cadência efectiva. Este registo histórico permite distinguir variações reais de ruído e fundamenta as decisões de realocação entre formatos.",
    priority: 20,
  });

  // Sort by priority desc, then id asc for stability. Slice to top 6.
  out.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
  return out.slice(0, 6);
}
