/**
 * Block 02 · Diagnóstico — pure deterministic classifiers used only by
 * `ReportShellV2` to render the 6-card editorial diagnostic grid.
 *
 * No I/O, no provider calls, no Supabase. Operates strictly over the
 * snapshot posts that already exist in `result`. Each classifier returns
 * a discriminated `{ available: boolean; ... }` result so the UI can
 * render a graceful empty state without hiding the card.
 */

import type { SnapshotPost } from "./snapshot-to-report-data";
import type { ReportData } from "@/components/report/report-mock-data";

// ─────────────────────────────────────────────────────────────────────
// Shared types
// ─────────────────────────────────────────────────────────────────────

export type ContentTypeLabel =
  | "Educativo"
  | "Promocional"
  | "Institucional"
  | "Inspiracional"
  | "Entretenimento"
  | "Prova social"
  | "Misto / pouco claro";

export interface ContentTypeResult {
  available: boolean;
  label: ContentTypeLabel | null;
  sharePct: number;
  sampleSize: number;
  reason?: string;
  /** Distribuição completa por categoria (apenas as 3 com mais peso são UI-relevantes). */
  distribution: Array<{ label: ContentTypeLabel; sharePct: number; count: number }>;
}

export type FunnelStageLabel =
  | "Topo do funil"
  | "Meio do funil"
  | "Fundo do funil"
  | "Pós-venda / fidelização"
  | "Comunicação dispersa";

export interface FunnelStageResult {
  available: boolean;
  label: FunnelStageLabel | null;
  sharePct: number;
  sampleSize: number;
  reason?: string;
  /** Distribuição das 4 fases reais (sem "dispersa"). */
  breakdown: Array<{
    stage: "topo" | "meio" | "fundo" | "pos";
    label: "TOPO · atrair" | "MEIO · educar" | "FUNDO · converter" | "PÓS · fidelizar";
    sharePct: number;
  }>;
}

export type CaptionPatternLabel =
  | "Curtas e diretas"
  | "Médias e explicativas"
  | "Longas e educativas"
  | "Pouco consistentes"
  | "Sem dados suficientes";

export interface CaptionPatternResult {
  available: boolean;
  label: CaptionPatternLabel;
  avgLength: number;
  ctaSharePct: number;
  /** % de posts cuja caption contém pelo menos uma pergunta real ("?"). */
  questionSharePct: number;
  /** True quando a amostra é grande o suficiente (≥ 4 posts) para a stat. */
  questionShareAvailable: boolean;
  sampleSize: number;
}

export type AudienceResponseLabel =
  | "Audiência ativa"
  | "Resposta moderada"
  | "Audiência silenciosa"
  | "Sem dados suficientes";

export interface AudienceResponseResult {
  available: boolean;
  label: AudienceResponseLabel;
  commentsToLikesPct: number;
  avgComments: number;
  sampleSize: number;
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function captionLen(p: SnapshotPost): number {
  if (typeof p.caption_length === "number" && Number.isFinite(p.caption_length)) {
    return p.caption_length;
  }
  return (p.caption ?? "").length;
}

function hasAny(text: string, terms: readonly string[]): boolean {
  for (const t of terms) {
    if (text.includes(t)) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────
// Card 1 — Tipo de conteúdo dominante
// ─────────────────────────────────────────────────────────────────────

const CT_TERMS = {
  Educativo: [
    "como ", "passo a passo", "passo", "guia", "dica", "dicas", "aprende",
    "tutorial", "porque", "razao", "razoes", "exemplo", "tutoriais",
    "explicacao", "ensino", "checklist",
  ],
  Promocional: [
    "promo", "desconto", "codigo", "compra ", "loja", "oferta", "%", "€",
    "eur", "black friday", "saldos", "vendas", "stock", "limitado",
  ],
  Institucional: [
    "equipa", "missao", "valores", "historia", "fundador", "empresa",
    "agencia", "estudio", "sobre nos",
  ],
  Inspiracional: [
    "acredita", "sonha", "sonho", "motivacao", "mindset", "inspira",
    "frase", "reflexao", "coragem",
  ],
  "Prova social": [
    "cliente", "testemunho", "review", "obrigado", "case", "antes/depois",
    "antes e depois", "resultado", "feedback",
  ],
} as const;

export function classifyContentType(posts: SnapshotPost[]): ContentTypeResult {
  if (!Array.isArray(posts) || posts.length < 4) {
    return {
      available: false,
      label: null,
      sharePct: 0,
      sampleSize: posts?.length ?? 0,
      reason: "Amostra insuficiente.",
      distribution: [],
    };
  }

  const counts: Record<string, number> = {
    Educativo: 0,
    Promocional: 0,
    Institucional: 0,
    Inspiracional: 0,
    Entretenimento: 0,
    "Prova social": 0,
  };

  let withSignal = 0;
  for (const p of posts) {
    const cap = normalize(p.caption ?? "");
    const tags = (p.hashtags ?? []).map((h) => normalize(h)).join(" ");
    const haystack = `${cap} ${tags}`;
    let matched = false;
    for (const [label, terms] of Object.entries(CT_TERMS)) {
      if (hasAny(haystack, terms)) {
        counts[label] = (counts[label] ?? 0) + 1;
        matched = true;
      }
    }
    // Entretenimento heuristic: short caption + Reel + visible emoji density.
    const fmt = (p.format ?? "").toLowerCase();
    const isReel = fmt.startsWith("reel") || fmt.startsWith("video");
    const len = captionLen(p);
    const emojis = (p.caption ?? "").match(/\p{Extended_Pictographic}/gu)?.length ?? 0;
    if (isReel && len < 80 && emojis >= 2) {
      counts.Entretenimento = (counts.Entretenimento ?? 0) + 1;
      matched = true;
    }
    if (matched) withSignal += 1;
  }

  if (withSignal < 3) {
    return {
      available: true,
      label: "Misto / pouco claro",
      sharePct: 0,
      sampleSize: posts.length,
      distribution: buildContentDistribution(counts, posts.length),
    };
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topLabel, topCount] = sorted[0];
  const secondCount = sorted[1]?.[1] ?? 0;
  const share = topCount / posts.length;

  if (share >= 0.35 && topCount >= secondCount * 1.5) {
    return {
      available: true,
      label: topLabel as ContentTypeLabel,
      sharePct: Math.round(share * 100),
      sampleSize: posts.length,
      distribution: buildContentDistribution(counts, posts.length),
    };
  }

  return {
    available: true,
    label: "Misto / pouco claro",
    sharePct: Math.round(share * 100),
    sampleSize: posts.length,
    distribution: buildContentDistribution(counts, posts.length),
  };
}

function buildContentDistribution(
  counts: Record<string, number>,
  total: number,
): ContentTypeResult["distribution"] {
  if (total <= 0) return [];
  const entries = Object.entries(counts) as Array<[ContentTypeLabel, number]>;
  return entries
    .filter(([, c]) => c > 0)
    .map(([label, c]) => ({
      label,
      count: c,
      sharePct: Math.round((c / total) * 100),
    }))
    .sort((a, b) => b.sharePct - a.sharePct)
    .slice(0, 4);
}

// ─────────────────────────────────────────────────────────────────────
// Card 2 — Fase do funil
// ─────────────────────────────────────────────────────────────────────

const FUNNEL_TERMS = {
  "Topo do funil": [
    "?", "sabias", "curiosidade", "voce sabia", "sabia que", "imagina",
    "acredita", "inspira", "motivacao",
  ],
  "Meio do funil": [
    "como ", "guia", "passo", "tutorial", "exemplo", "checklist",
    "explicacao", "ensino",
  ],
  "Fundo do funil": [
    "compra", "agenda", "marca ja", "marca já", "link na bio", "whatsapp",
    " dm ", "dm para", "promo", "desconto", "codigo", "%", "€",
    "encomenda", "reserva",
  ],
  "Pós-venda / fidelização": [
    "obrigado", "comunidade", "cliente", "testemunho", "feedback",
    "agradeco", "review",
  ],
} as const;

export function classifyFunnelStage(posts: SnapshotPost[]): FunnelStageResult {
  if (!Array.isArray(posts) || posts.length < 4) {
    return {
      available: false,
      label: null,
      sharePct: 0,
      sampleSize: posts?.length ?? 0,
      reason: "Amostra insuficiente.",
      breakdown: [],
    };
  }

  const counts: Record<string, number> = {
    "Topo do funil": 0,
    "Meio do funil": 0,
    "Fundo do funil": 0,
    "Pós-venda / fidelização": 0,
  };

  let withSignal = 0;
  for (const p of posts) {
    const cap = normalize(p.caption ?? "");
    let matched = false;
    for (const [label, terms] of Object.entries(FUNNEL_TERMS)) {
      if (hasAny(cap, terms)) {
        counts[label] = (counts[label] ?? 0) + 1;
        matched = true;
      }
    }
    if (matched) withSignal += 1;
  }

  if (withSignal < 3) {
    return {
      available: true,
      label: "Comunicação dispersa",
      sharePct: 0,
      sampleSize: posts.length,
      breakdown: buildFunnelBreakdown(counts, posts.length),
    };
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const [topLabel, topCount] = sorted[0];
  const share = topCount / posts.length;

  if (share >= 0.35) {
    return {
      available: true,
      label: topLabel as FunnelStageLabel,
      sharePct: Math.round(share * 100),
      sampleSize: posts.length,
      breakdown: buildFunnelBreakdown(counts, posts.length),
    };
  }

  return {
    available: true,
    label: "Comunicação dispersa",
    sharePct: Math.round(share * 100),
    sampleSize: posts.length,
    breakdown: buildFunnelBreakdown(counts, posts.length),
  };
}

function buildFunnelBreakdown(
  counts: Record<string, number>,
  total: number,
): FunnelStageResult["breakdown"] {
  if (total <= 0) return [];
  const map: Array<{
    stage: "topo" | "meio" | "fundo" | "pos";
    label: FunnelStageResult["breakdown"][number]["label"];
    key: string;
  }> = [
    { stage: "topo", label: "TOPO · atrair", key: "Topo do funil" },
    { stage: "meio", label: "MEIO · educar", key: "Meio do funil" },
    { stage: "fundo", label: "FUNDO · converter", key: "Fundo do funil" },
    { stage: "pos", label: "PÓS · fidelizar", key: "Pós-venda / fidelização" },
  ];
  return map.map((m) => ({
    stage: m.stage,
    label: m.label,
    sharePct: Math.round(((counts[m.key] ?? 0) / total) * 100),
  }));
}

// ─────────────────────────────────────────────────────────────────────
// Card 5 — Padrão das captions
// ─────────────────────────────────────────────────────────────────────

const CTA_TERMS = [
  "link na bio", "comenta", "partilha", "guarda", "marca ", "diz-me",
  "diz me", "envia dm", "dm para", "?", "agenda", "compra", "reserva",
  "subscreve", "inscreve",
];

export function classifyCaptionPattern(
  posts: SnapshotPost[],
): CaptionPatternResult {
  if (!Array.isArray(posts) || posts.length < 4) {
    return {
      available: false,
      label: "Sem dados suficientes",
      avgLength: 0,
      ctaSharePct: 0,
      questionSharePct: 0,
      questionShareAvailable: false,
      sampleSize: posts?.length ?? 0,
    };
  }

  const lengths = posts.map(captionLen);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const short = lengths.filter((n) => n < 80).length;
  const mid = lengths.filter((n) => n >= 80 && n <= 250).length;
  const long = lengths.filter((n) => n > 250).length;

  const ctaCount = posts.reduce((acc, p) => {
    const cap = normalize(p.caption ?? "");
    return hasAny(cap, CTA_TERMS) ? acc + 1 : acc;
  }, 0);
  const ctaShare = ctaCount / posts.length;

  const questionShare = classifyQuestionShare(posts);
  const questionSharePct = questionShare.questionSharePct;
  const questionShareAvailable = questionShare.available;

  // Consistency: ≥ 60% sit in a single bucket
  const total = posts.length;
  const dominant = Math.max(short, mid, long);
  if (dominant / total < 0.5) {
    return {
      available: true,
      label: "Pouco consistentes",
      avgLength: Math.round(avg),
      ctaSharePct: Math.round(ctaShare * 100),
      questionSharePct,
      questionShareAvailable,
      sampleSize: total,
    };
  }

  let label: CaptionPatternLabel;
  if (short === dominant) label = "Curtas e diretas";
  else if (long === dominant) label = "Longas e educativas";
  else label = "Médias e explicativas";

  return {
    available: true,
    label,
    avgLength: Math.round(avg),
    ctaSharePct: Math.round(ctaShare * 100),
    questionSharePct,
    questionShareAvailable,
    sampleSize: total,
  };
}

/**
 * Conta a percentagem de posts cuja caption (excluindo hashtags) contém
 * pelo menos uma pergunta real (`?`). Disponível só com ≥ 4 posts.
 * Usado pelo cartão 05 para evitar inventar a stat "COM PERGUNTAS".
 *
 * Determinístico, sem inferência por termos de CTA, sem multiplicadores.
 */
export function classifyQuestionShare(
  posts: SnapshotPost[],
): {
  available: boolean;
  questionSharePct: number;
  questionCount: number;
  postsCount: number;
} {
  const postsCount = Array.isArray(posts) ? posts.length : 0;
  if (postsCount < 4) {
    return {
      available: false,
      questionSharePct: 0,
      questionCount: 0,
      postsCount,
    };
  }
  let questionCount = 0;
  for (const p of posts) {
    const raw = p.caption ?? "";
    // Remove hashtags antes de procurar `?` para não contar #tag? etc.
    const stripped = raw.replace(/#\S+/g, " ");
    if (stripped.includes("?")) questionCount += 1;
  }
  return {
    available: true,
    questionSharePct: Math.round((questionCount / postsCount) * 100),
    questionCount,
    postsCount,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Card 6 — Resposta do público
// ─────────────────────────────────────────────────────────────────────

export function classifyAudienceResponse(
  posts: SnapshotPost[],
): AudienceResponseResult {
  if (!Array.isArray(posts) || posts.length < 4) {
    return {
      available: false,
      label: "Sem dados suficientes",
      commentsToLikesPct: 0,
      avgComments: 0,
      sampleSize: posts?.length ?? 0,
    };
  }

  let totalLikes = 0;
  let totalComments = 0;
  let counted = 0;
  for (const p of posts) {
    const likes = typeof p.likes === "number" ? p.likes : 0;
    const comments = typeof p.comments === "number" ? p.comments : 0;
    if (likes <= 0 && comments <= 0) continue;
    totalLikes += likes;
    totalComments += comments;
    counted += 1;
  }

  if (counted < 4 || totalLikes <= 0) {
    return {
      available: false,
      label: "Sem dados suficientes",
      commentsToLikesPct: 0,
      avgComments: counted > 0 ? Math.round(totalComments / counted) : 0,
      sampleSize: counted,
    };
  }

  const ratioPct = (totalComments / totalLikes) * 100;
  const avgComments = totalComments / counted;

  let label: AudienceResponseLabel;
  if (ratioPct >= 2 && avgComments >= 10) label = "Audiência ativa";
  else if (ratioPct >= 0.8 || avgComments >= 5) label = "Resposta moderada";
  else label = "Audiência silenciosa";

  return {
    available: true,
    label,
    commentsToLikesPct: Math.round(ratioPct * 10) / 10,
    avgComments: Math.round(avgComments),
    sampleSize: counted,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Card 4 — Temas e hashtags recorrentes
// ─────────────────────────────────────────────────────────────────────

export type ThemesSource = "hashtags" | "keywords";

export interface ThemesResult {
  available: boolean;
  source: ThemesSource | null;
  label: string;
  items: Array<{ text: string; weight: number }>;
}

export function inferThemes(
  topHashtags: ReportData["topHashtags"],
  topKeywords: ReportData["topKeywords"],
): ThemesResult {
  const tags = Array.isArray(topHashtags) ? topHashtags : [];
  const kws = Array.isArray(topKeywords) ? topKeywords : [];
  if (tags.length >= 2) {
    return {
      available: true,
      source: "hashtags",
      label: "Hashtags mais recorrentes",
      items: tags.slice(0, 3).map((t) => ({
        text: t.tag.startsWith("#") ? t.tag : `#${t.tag}`,
        weight: t.uses,
      })),
    };
  }
  if (kws.length >= 2) {
    return {
      available: true,
      source: "keywords",
      label: "Temas mais recorrentes",
      items: kws.slice(0, 3).map((k) => ({ text: k.word, weight: k.count })),
    };
  }
  return {
    available: false,
    source: null,
    label: "Sem temas recorrentes detetados",
    items: [],
  };
}

// ─────────────────────────────────────────────────────────────────────
// Card 7 — Integração entre canais
// ─────────────────────────────────────────────────────────────────────

export type IntegrationLabel =
  | "Integração clara"
  | "Integração parcial"
  | "Pouca ligação visível"
  | "Sem sinais suficientes";

export interface IntegrationResult {
  available: boolean;
  label: IntegrationLabel;
  signals: {
    bioLink: { detected: boolean; value?: string };
    siteOrNewsletter: { detected: boolean; count: number };
    explicitCta: { detected: boolean; sharePct: number };
  };
}

const URL_RE = /\b(https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(pt|com|net|io|co|app|dev|me|org)\b/i;
const NEWSLETTER_TERMS = [
  "newsletter", "subscreve", "subscrever", "site:", "blog", "podcast",
  ".pt", ".com", "/loja", "youtube",
];

export function classifyChannelIntegration(
  bio: string | null,
  externalUrls: string[],
  posts: SnapshotPost[],
): IntegrationResult {
  const safeBio = bio ?? "";
  const bioNorm = normalize(safeBio);
  // Prioridade 1: campo `external_urls` real do Instagram (não inventa).
  // Prioridade 2: fallback — URL escrita no texto da bio.
  const safeUrls = Array.isArray(externalUrls) ? externalUrls : [];
  const hasExternalUrl = safeUrls.length > 0;
  const bioTextHasUrl = URL_RE.test(safeBio);
  const bioHasUrl = hasExternalUrl || bioTextHasUrl;
  let bioLinkValue: string | undefined;
  if (hasExternalUrl) {
    bioLinkValue = safeUrls[0];
  } else {
    const m = safeBio.match(URL_RE);
    if (m && m[0]) bioLinkValue = m[0];
  }

  let newsletterCount = 0;
  for (const p of posts) {
    const cap = normalize(p.caption ?? "");
    if (hasAny(cap, NEWSLETTER_TERMS)) newsletterCount += 1;
  }

  const ctaCount = posts.reduce((acc, p) => {
    const cap = normalize(p.caption ?? "");
    return hasAny(cap, CTA_TERMS) ? acc + 1 : acc;
  }, 0);
  const ctaShare = posts.length > 0 ? Math.round((ctaCount / posts.length) * 100) : 0;
  const ctaDetected = ctaShare >= 25;

  const score =
    (bioHasUrl ? 1 : 0) +
    (newsletterCount >= 2 ? 1 : 0) +
    (ctaDetected ? 1 : 0);

  let label: IntegrationLabel;
  if (!bioHasUrl && newsletterCount === 0 && !ctaDetected && posts.length < 4) {
    label = "Sem sinais suficientes";
  } else if (score >= 3) label = "Integração clara";
  else if (score >= 1) label = "Integração parcial";
  else label = "Pouca ligação visível";

  // Hint of "newsletter" specifically
  const newsletterHits = posts.reduce((acc, p) => {
    const cap = normalize(p.caption ?? "");
    return cap.includes("newsletter") ? acc + 1 : acc;
  }, 0);

  return {
    available: true,
    label,
    signals: {
      bioLink: { detected: bioHasUrl, value: bioLinkValue },
      siteOrNewsletter: {
        detected: newsletterCount > 0,
        count: newsletterHits || newsletterCount,
      },
      explicitCta: { detected: ctaDetected, sharePct: ctaShare },
    },
  };

  // bioNorm reserved for future signals
  void bioNorm;
}

// ─────────────────────────────────────────────────────────────────────
// Card 8 — Objetivo provável
// ─────────────────────────────────────────────────────────────────────

export type ObjectiveLabel =
  | "Notoriedade · marca pessoal"
  | "Geração de leads"
  | "Comunidade"
  | "Vendas online"
  | "Educação de audiência";

export interface ObjectiveResult {
  available: boolean;
  primary: ObjectiveLabel | null;
  ranking: Array<{ label: ObjectiveLabel; score: number }>;
  confidence: "low" | "med";
}

export function inferProbableObjective(args: {
  contentType: ContentTypeResult;
  funnel: FunnelStageResult;
  integration: IntegrationResult;
  bio: string | null;
  audience: AudienceResponseResult;
}): ObjectiveResult {
  const { contentType, funnel, integration, bio, audience } = args;
  const scores: Record<ObjectiveLabel, number> = {
    "Notoriedade · marca pessoal": 0,
    "Geração de leads": 0,
    "Comunidade": 0,
    "Vendas online": 0,
    "Educação de audiência": 0,
  };

  // Educativo dominante → educação + notoriedade
  if (contentType.label === "Educativo") {
    scores["Educação de audiência"] += 3;
    scores["Notoriedade · marca pessoal"] += 2;
  }
  if (contentType.label === "Inspiracional") {
    scores["Notoriedade · marca pessoal"] += 2;
  }
  if (contentType.label === "Promocional") {
    scores["Vendas online"] += 3;
  }
  if (contentType.label === "Institucional") {
    scores["Notoriedade · marca pessoal"] += 1;
  }

  if (funnel.label === "Topo do funil") {
    scores["Notoriedade · marca pessoal"] += 2;
  }
  if (funnel.label === "Meio do funil") {
    scores["Educação de audiência"] += 2;
    scores["Geração de leads"] += 1;
  }
  if (funnel.label === "Fundo do funil") {
    scores["Vendas online"] += 2;
    scores["Geração de leads"] += 2;
  }
  if (funnel.label === "Pós-venda / fidelização") {
    scores["Comunidade"] += 3;
  }

  if (integration.signals.bioLink.detected) {
    scores["Geração de leads"] += 1;
    const url = (integration.signals.bioLink.value ?? "").toLowerCase();
    if (/loja|shop|store|comprar/.test(url)) scores["Vendas online"] += 2;
  }
  if (integration.signals.siteOrNewsletter.detected) {
    scores["Geração de leads"] += 1;
  }

  if (audience.label === "Audiência ativa") {
    scores["Comunidade"] += 1;
  }

  const bioNorm = normalize(bio ?? "");
  if (/loja|shop|store/.test(bioNorm)) scores["Vendas online"] += 1;
  if (/newsletter|subscreve/.test(bioNorm)) scores["Geração de leads"] += 1;
  if (/comunidade|membros/.test(bioNorm)) scores["Comunidade"] += 1;

  const ranking = (Object.entries(scores) as Array<[ObjectiveLabel, number]>)
    .sort((a, b) => b[1] - a[1])
    .map(([label, score]) => ({ label, score }));

  const top = ranking[0];
  const totalSignal = ranking.reduce((a, b) => a + b.score, 0);

  if (totalSignal === 0 || !top) {
    return {
      available: false,
      primary: null,
      ranking: [],
      confidence: "low",
    };
  }

  const second = ranking[1]?.score ?? 0;
  const confidence: "low" | "med" =
    top.score >= 4 && top.score - second >= 2 ? "med" : "low";

  return {
    available: true,
    primary: top.label,
    ranking: ranking.filter((r) => r.score > 0).slice(0, 4),
    confidence,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Prioridades de ação (derivadas)
// ─────────────────────────────────────────────────────────────────────

export type PriorityLevel = "alta" | "media" | "oportunidade";

export interface PriorityItem {
  level: PriorityLevel;
  title: string;
  body: string;
  resolves: string;
}

export function derivePriorities(args: {
  contentType: ContentTypeResult;
  funnel: FunnelStageResult;
  caption: CaptionPatternResult;
  audience: AudienceResponseResult;
  integration: IntegrationResult;
  dominantFormatShare: number;
  dominantFormatLabel: string | null;
}): PriorityItem[] {
  const out: PriorityItem[] = [];
  const {
    caption,
    audience,
    integration,
    dominantFormatShare,
    dominantFormatLabel,
    funnel,
  } = args;

  // ALTA: público silencioso + poucas perguntas/CTAs
  if (
    audience.available &&
    (audience.label === "Audiência silenciosa" ||
      (caption.available && caption.ctaSharePct < 15))
  ) {
    out.push({
      level: "alta",
      title: "Adicionar perguntas no fim das captions",
      body:
        caption.available && caption.label === "Longas e educativas"
          ? "Captions já são longas — basta acrescentar uma pergunta clara para convidar o público a conversar."
          : "Convidar o leitor a responder ajuda a transformar consumo passivo em interação visível.",
      resolves: "Resolve a Pergunta 06 — resposta do público.",
    });
  }

  // MÉDIA: dependência de formato
  if (dominantFormatShare >= 60 && dominantFormatLabel) {
    out.push({
      level: "media",
      title: `Diversificar formatos além de ${dominantFormatLabel}`,
      body: `Cerca de ${Math.round(
        dominantFormatShare,
      )} % das publicações são em ${dominantFormatLabel}. Testar formatos complementares pode equilibrar o alcance e a conversa.`,
      resolves: "Resolve a Pergunta 03 — formato dominante.",
    });
  }

  // OPORTUNIDADE: meio de funil ausente / ligação fraca
  if (
    funnel.available &&
    funnel.label !== "Meio do funil" &&
    integration.signals.explicitCta.sharePct < 30
  ) {
    out.push({
      level: "oportunidade",
      title: "Reforçar conteúdo de meio de funil",
      body:
        "Há margem para criar conteúdo que explica e aprofunda — peças que posicionam o perfil como referência antes de pedir ação.",
      resolves: "Resolve as Perguntas 02 e 08 — fase do funil e objetivo.",
    });
  }

  // Se nada disparou, fallback útil baseado em integração
  if (out.length === 0 && integration.available) {
    out.push({
      level: "oportunidade",
      title: "Tornar a ligação entre canais mais visível",
      body:
        "Mencionar site, newsletter ou outros canais nas captions ajuda a audiência a sair do Instagram quando faz sentido.",
      resolves: "Resolve a Pergunta 07 — integração entre canais.",
    });
  }

  return out.slice(0, 3);
}