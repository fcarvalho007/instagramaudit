/**
 * Editorial verdict resolver — guard determinístico (Prompt 4, Parte 4).
 *
 * Compara o veredicto que veio da IA contra as métricas reais do snapshot
 * e rejeita / rebaixa quando há contradição. Puro: sem i18n, sem I/O.
 *
 * Estratégia:
 *  - 0 contradições        → devolve `ai` tal como veio.
 *  - 1 contradição         → preserva estrutura mas substitui o `paragraph`
 *                            pelo do `fallback` e força `confidence: "low"`.
 *  - ≥ 2 contradições      → descarta IA e devolve `fallback` (confidence low).
 *  - `ai === null`         → devolve `fallback` (confidence low).
 */

import type { EditorialVerdict } from "@/lib/insights/types";

export interface EditorialVerdictMetrics {
  /** Cadência corrigida (posts/semana nos últimos 30d). */
  postsPerWeek30d: number | null;
  /** Flag do módulo cadence: amostra suficiente para uma leitura defensável. */
  cadenceSufficient: boolean;
  /** Fiabilidade do cálculo de cadência (high/medium/low). Quando ausente
   *  assume "high" para retro-compatibilidade com chamadas antigas. */
  cadenceReliability?: "high" | "medium" | "low";
  /** Envolvimento médio do perfil em %. */
  engagementPct: number;
  /** Envolvimento de referência do tier em %. Null = sem benchmark. */
  benchmarkEngagementPct: number | null;
  /** Média de comentários por post. */
  avgComments: number;
  /** Média de gostos por post. */
  avgLikes: number;
  /** Quantidade de concorrentes com dados reais. */
  competitorsCount: number;
  /** Total de posts considerados na amostra. */
  postsAnalyzed: number;
}

export type EditorialVerdictSource = "ai" | "ai_downgraded" | "fallback";

export type EditorialVerdictRejection =
  | "cadence_contradiction"
  | "engagement_contradiction"
  | "conversation_contradiction"
  | "phantom_competitors"
  | "prescriptive_language"
  | "attention_no_conversation_missed"
  | "low_sample_strong_claim";

export interface EditorialVerdictResolution {
  verdict: EditorialVerdict;
  source: EditorialVerdictSource;
  rejectionReasons: ReadonlyArray<EditorialVerdictRejection>;
}

/* ── Regex de contradição (pt-PT) ─────────────────────────────────── */

// "cadência fraca", "baixa cadência", "publica pouco", "publicar mais",
// "aumentar (a )?frequência", "publicações são raras".
const RE_CADENCE_WEAK =
  /\b(cad[êe]ncia\s+(fraca|baixa|irregular)|baixa\s+cad[êe]ncia|publica(r)?\s+(pouco|mais|com\s+mais\s+frequ[êe]ncia)|aumentar\s+a?\s*frequ[êe]ncia|publica[çc][õo]es?\s+raras|posta(r)?\s+mais)\b/i;

// "envolvimento forte/excelente/elevado", "reage muito", "audiência reage bem".
const RE_ENGAGEMENT_STRONG =
  /\b(envolvimento\s+(forte|excelente|elevado|alto)|reage\s+muito|audi[êe]ncia\s+reage\s+(bem|muito))\b/i;

// "audiência não reage", "não há reação", "envolvimento muito fraco".
const RE_ENGAGEMENT_WEAK =
  /\b(audi[êe]ncia\s+n[ãa]o\s+reage|n[ãa]o\s+h[áa]\s+rea[çc][ãa]o|envolvimento\s+(muito\s+)?(fraco|baixo))\b/i;

// "conversa ativa/saudável/rica", "comentários ricos/activos".
const RE_CONVERSATION_HEALTHY =
  /\b(conversa\s+(ativa|activa|saud[áa]vel|rica)|comunidade\s+ativa|coment[áa]rios\s+(ricos|activos|ativos))\b/i;

// "concorrente(s)", "competidor(es)", "benchmark do setor/sector",
// "vs concorrência", "face aos concorrentes".
const RE_COMPETITORS =
  /\b(concorrent(e|es)|competidor(es)?|benchmark\s+do\s+s[ée]ctor|concorr[êe]ncia)\b/i;

// "ritmo (consistente|saudável|estável|forte|sólido)", "cadência consistente/sólida/forte",
// "publica de forma consistente", "publicações regulares".
const RE_CADENCE_STRONG =
  /\b(ritmo\s+(consistente|saud[áa]vel|est[áa]vel|forte|s[óo]lido|regular)|cad[êe]ncia\s+(consistente|saud[áa]vel|est[áa]vel|forte|s[óo]lida|regular)|publica(r)?\s+de\s+forma\s+consistente|publica[çc][õo]es\s+regulares)\b/i;

// Verbos prescritivos no parágrafo — defesa em profundidade caso o
// validador (que opera sobre o JSON cru) deixe passar.
const RE_PRESCRIPTIVE =
  /\b(deve(s|m)?|deveria(m|s)?|recomenda[- ]se|a\s+prioridade\s+é|publique(m)?|teste(m)?|use(m)?\s+mais|aposte(m)?|publicar\s+mais|cria(r)?\s+mais|apostar\s+em)\b/i;

// Marca diagnóstica de "atenção sem conversa". Quando likes saudáveis +
// comentários quase nulos, exigimos que a IA enquadre o cenário desta
// forma; caso contrário consideramos contradição.
const RE_ATTENTION_FRAMING =
  /\b(aten[çc][ãa]o\s+sem\s+conversa|sem\s+conversa|pouca\s+conversa|coment[áa]rios\s+raros|silenciosa|silencioso|silen[cç]io)\b/i;

const CADENCE_HEALTHY_THRESHOLD = 2.5; // posts/semana
const ENGAGEMENT_ABOVE_RATIO = 1.1; // >10% acima da referência
const ENGAGEMENT_BELOW_RATIO = 0.7; // <70% da referência
const LOW_COMMENTS_THRESHOLD = 2; // média < 2 → sem conversa
const MIN_SAMPLE_FOR_STRONG_CLAIM = 4; // < 4 posts → fallback obrigatório
const ATTENTION_LIKES_RATIO = 0.9; // likes ≥ 90% do benchmark = saudável

/** Junta todos os campos textuais que o utilizador vê. */
function corpus(v: EditorialVerdict): string {
  return [
    v.title,
    v.paragraph,
    v.priority,
    ...v.strengths,
    ...v.limitations,
  ].join(" \n ");
}

/**
 * Conta contradições entre o veredicto e as métricas reais. Retorna a
 * lista de motivos (ordem estável) para diagnóstico.
 */
export function detectVerdictContradictions(
  ai: EditorialVerdict,
  m: EditorialVerdictMetrics,
): EditorialVerdictRejection[] {
  const text = corpus(ai);
  const reasons: EditorialVerdictRejection[] = [];

  // 1. cadência saudável + IA diz "publicar mais / cadência fraca".
  const cadenceHealthy =
    m.cadenceSufficient &&
    typeof m.postsPerWeek30d === "number" &&
    m.postsPerWeek30d >= CADENCE_HEALTHY_THRESHOLD;
  if (cadenceHealthy && RE_CADENCE_WEAK.test(text)) {
    reasons.push("cadence_contradiction");
  }

  // 1b. fiabilidade baixa + IA afirma "ritmo consistente/forte" → contradição.
  // Inclui o caso "cadenceSufficient: false" (insuficiente) para bloquear
  // qualquer afirmação positiva sobre cadência quando a amostra não suporta.
  const reliability = m.cadenceReliability ?? "high";
  const cadenceUnreliable = reliability === "low" || !m.cadenceSufficient;
  if (cadenceUnreliable && RE_CADENCE_STRONG.test(text)) {
    reasons.push("cadence_contradiction");
  }

  // 2. envolvimento vs benchmark.
  if (typeof m.benchmarkEngagementPct === "number" && m.benchmarkEngagementPct > 0) {
    const ratio = m.engagementPct / m.benchmarkEngagementPct;
    // Acima do benchmark mas IA diz que ninguém reage.
    if (ratio >= ENGAGEMENT_ABOVE_RATIO && RE_ENGAGEMENT_WEAK.test(text)) {
      reasons.push("engagement_contradiction");
    }
    // Abaixo do benchmark mas IA pinta como "forte".
    else if (ratio < ENGAGEMENT_BELOW_RATIO && RE_ENGAGEMENT_STRONG.test(text)) {
      reasons.push("engagement_contradiction");
    }
  }

  // 3. comentários quase nulos + IA fala em "conversa saudável".
  if (m.avgComments < LOW_COMMENTS_THRESHOLD && RE_CONVERSATION_HEALTHY.test(text)) {
    reasons.push("conversation_contradiction");
  }

  // 4. menção a concorrentes quando nenhum existe.
  if (m.competitorsCount === 0 && RE_COMPETITORS.test(text)) {
    reasons.push("phantom_competitors");
  }

  // 5. amostra demasiado pequena para uma conclusão categórica.
  if (
    m.postsAnalyzed > 0 &&
    m.postsAnalyzed < MIN_SAMPLE_FOR_STRONG_CLAIM &&
    (ai.verdict_label === "strong" || ai.verdict_label === "promising")
  ) {
    reasons.push("low_sample_strong_claim");
  }

  // 6. atenção sem conversa: likes saudáveis mas comentários quase nulos.
  //    Se a IA não enquadrou o padrão como "silenciosa / sem conversa",
  //    consideramos diagnóstico errado.
  if (
    typeof m.benchmarkEngagementPct === "number" &&
    m.benchmarkEngagementPct > 0 &&
    m.engagementPct / m.benchmarkEngagementPct >= ATTENTION_LIKES_RATIO &&
    m.avgComments < LOW_COMMENTS_THRESHOLD &&
    !RE_ATTENTION_FRAMING.test(text)
  ) {
    reasons.push("attention_no_conversation_missed");
  }

  // 7. verbos prescritivos no corpus (defesa em profundidade).
  if (RE_PRESCRIPTIVE.test(ai.paragraph)) {
    reasons.push("prescriptive_language");
  }

  return reasons;
}

/**
 * Resolve o veredicto final a partir da IA, das métricas e do fallback
 * determinístico. Ver topo do ficheiro para a tabela de decisão.
 */
export function deriveEditorialVerdict(
  ai: EditorialVerdict | null,
  metrics: EditorialVerdictMetrics,
  fallback: EditorialVerdict,
): EditorialVerdictResolution {
  if (!ai) {
    return {
      verdict: { ...fallback, confidence: "low" },
      source: "fallback",
      rejectionReasons: [],
    };
  }

  const reasons = detectVerdictContradictions(ai, metrics);

  if (reasons.length === 0) {
    return { verdict: ai, source: "ai", rejectionReasons: [] };
  }

  if (reasons.length === 1) {
    return {
      verdict: {
        ...ai,
        paragraph: fallback.paragraph,
        confidence: "low",
      },
      source: "ai_downgraded",
      rejectionReasons: reasons,
    };
  }

  return {
    verdict: { ...fallback, confidence: "low" },
    source: "fallback",
    rejectionReasons: reasons,
  };
}