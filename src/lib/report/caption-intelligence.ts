/**
 * Caption Intelligence — Pergunta 04 "Leitura das legendas".
 *
 * Pure, deterministic module. Recebe os posts da snapshot e (opcionalmente)
 * o texto da leitura editorial gerado pela IA (`aiInsightsV2.sections.language`)
 * e devolve uma estrutura uniforme com 5 blocos:
 *
 *  1. captionThemes        — temas semânticos (LEITURA AUTOMÁTICA)
 *  2. contentTypeMix       — distribuição por tipo de conteúdo (LEITURA AUTOMÁTICA)
 *  3. recurringExpressions — bigramas / expressões recorrentes (DADOS EXTRAÍDOS)
 *  4. ctaPatterns          — padrões de CTA / perguntas (LEITURA AUTOMÁTICA)
 *  5. editorialReading     — leitura editorial (LEITURA IA quando há texto, senão LEITURA AUTOMÁTICA)
 *
 * Cada bloco carrega o seu próprio `source` para a UI escolher a badge.
 * Hashtags são deliberadamente excluídas dos temas e expressões — vivem no
 * cartão dedicado (Pergunta 03). Tudo o que entra como tema vem só do TEXTO
 * das legendas.
 */

import type { SnapshotPost } from "./snapshot-to-report-data";
import type { ThemeRow } from "./text-extract";

export type CaptionSourceKind = "extracted" | "auto" | "ai";

export type ContentTypeMixLabel =
  | "Educativo"
  | "Opinião / análise"
  | "Promocional"
  | "Institucional"
  | "Bastidores / pessoal"
  | "Convite / CTA";

export type DominantCtaType =
  | "newsletter"
  | "comment"
  | "link"
  | "message"
  | "save"
  | "share"
  | "none"
  | "other";

export type ThemeRole =
  | "educativo"
  | "autoridade"
  | "conversão"
  | "comunidade"
  | "opinião"
  | "promocional"
  | "outro";

export type ThemeConfidence = "low" | "medium" | "high";

export type CtaStrength = "weak" | "moderate" | "strong";

export interface CaptionThemeItem {
  label: string;
  /** Nº de posts distintos onde apareceu. */
  postsCount: number;
  /** Excerto curto da legenda (≤ 90 chars). Vazio quando não há. */
  evidence: string | null;
  /** Papel editorial inferido por co-ocorrência com termos de conteúdo. */
  role: ThemeRole;
  /** Confiança baseada em postsCount / sampleSize. */
  confidence: ThemeConfidence;
}

export interface ContentTypeMixItem {
  type: ContentTypeMixLabel;
  sharePct: number;
  count: number;
}

export interface RecurringExpressionItem {
  expression: string;
  count: number;
  type: "topic" | "cta" | "brand" | "product" | "community" | "other";
}

export interface CtaPatternsBlock {
  source: CaptionSourceKind;
  hasCtaPct: number;
  hasQuestionPct: number;
  dominantCtaType: DominantCtaType;
  /** Label legível em pt-PT do dominantCtaType (ex.: "Subscrever newsletter"). */
  dominantCtaLabel: string;
  summary: string;
  /** Força global do CTA nas legendas. */
  ctaStrength: CtaStrength;
}

export interface EditorialReadingBlock {
  source: CaptionSourceKind;
  whatItCommunicates: string;
  whatWorks: string;
  whatIsMissing: string;
  /** Recomendação de melhoria, no infinitivo. Pode ser usado pelo plano de ação. */
  recommendedImprovement: string | null;
}

export interface SnapshotRow {
  dominantTheme: string;
  mainIntent: string;
  mainOpportunity: string;
}

export interface ActionBridge {
  title: string;
  body: string;
  priorityType: "alta" | "media" | "oportunidade";
}

export interface CaptionIntelligence {
  /** Nº de posts com caption não vazia. Usado no header "Baseado em N posts". */
  sampleSize: number;
  /** True quando há captions suficientes para mostrar a leitura (≥ 4). */
  available: boolean;
  /** 3 insights de topo para leitura rápida (< 5 s). */
  snapshot: SnapshotRow;
  themes: { source: CaptionSourceKind; items: CaptionThemeItem[] };
  contentTypeMix: { source: CaptionSourceKind; items: ContentTypeMixItem[]; dominant: ContentTypeMixLabel | null };
  recurringExpressions: { source: CaptionSourceKind; items: RecurringExpressionItem[] };
  ctaPatterns: CtaPatternsBlock;
  editorialReading: EditorialReadingBlock;
  /** Strip de ação sugerida no final do cartão. */
  actionBridge: ActionBridge;
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
  for (const t of terms) if (text.includes(t)) return true;
  return false;
}

/** Strip URLs / hashtags / mentions / domain tokens — mantém só texto editorial. */
function cleanCaption(raw: string): string {
  return raw
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\b[\w-]+(?:\.[\w-]+){1,}(?:\/\S*)?/g, " ")
    .replace(/[#@][\p{L}\p{N}_]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ─────────────────────────────────────────────────────────────────────
// Bloco 1 · Temas
// ─────────────────────────────────────────────────────────────────────

/**
 * Reaproveita `ThemeRow` (já remove URLs / hashtags / stopwords). Adicional:
 * remover qualquer label cujo lowercase coincida com uma das top hashtags,
 * para garantir a separação editorial entre Pergunta 03 e Pergunta 04.
 */
function buildThemes(
  topThemes: readonly ThemeRow[],
  topHashtagLabels: ReadonlyArray<string>,
): CaptionThemeItem[] {
  const banned = new Set(
    topHashtagLabels.map((h) => normalize(h.replace(/^#/, ""))),
  );
  const out: CaptionThemeItem[] = [];
  for (const t of topThemes) {
    const flat = normalize(t.word).replace(/\s+/g, "");
    if (banned.has(flat)) continue;
    out.push({
      label: t.word,
      postsCount: t.postsCount,
      evidence: t.snippets[0] ?? null,
    });
    if (out.length >= 5) break;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────
// Bloco 2 · Tipo de conteúdo (categorias humanas)
// ─────────────────────────────────────────────────────────────────────

const CONTENT_MIX_TERMS: ReadonlyArray<{ type: ContentTypeMixLabel; terms: readonly string[] }> = [
  {
    type: "Educativo",
    terms: [
      "como ", "passo a passo", "passo", "guia", "dica", "dicas", "aprende",
      "tutorial", "explicacao", "ensino", "checklist", "exemplo", "porque",
    ],
  },
  {
    type: "Opinião / análise",
    terms: [
      "acho que", "na minha opiniao", "opiniao", "analise", "reflexao",
      "penso que", "acredito", "discutir", "vejo que", "perspectiva",
    ],
  },
  {
    type: "Promocional",
    terms: [
      "promo", "desconto", "codigo", "compra ", "loja", "oferta", "%", "€",
      "eur", "saldos", "limitado", "stock",
    ],
  },
  {
    type: "Institucional",
    terms: [
      "equipa", "missao", "valores", "historia", "fundador", "empresa",
      "agencia", "estudio", "sobre nos",
    ],
  },
  {
    type: "Bastidores / pessoal",
    terms: [
      "bastidores", "por tras", "diario", "rotina", "vida ", "familia",
      "casa", "viagem", "ontem", "hoje vivi", "behind",
    ],
  },
  {
    type: "Convite / CTA",
    terms: [
      "subscreve", "subscrever", "inscreve", "inscrever", "newsletter",
      "agenda", "marca ja", "marca já", "link na bio", "envia dm", "dm para",
      "comenta", "guarda", "partilha", "reserva",
    ],
  },
];

function buildContentTypeMix(posts: readonly SnapshotPost[]): {
  items: ContentTypeMixItem[];
  dominant: ContentTypeMixLabel | null;
} {
  if (posts.length === 0) return { items: [], dominant: null };
  const counts = new Map<ContentTypeMixLabel, number>();
  for (const p of posts) {
    const cap = normalize(cleanCaption(p.caption ?? ""));
    if (!cap) continue;
    for (const { type, terms } of CONTENT_MIX_TERMS) {
      if (hasAny(cap, terms)) {
        counts.set(type, (counts.get(type) ?? 0) + 1);
      }
    }
  }
  const total = posts.length;
  const items: ContentTypeMixItem[] = [];
  for (const [type, c] of counts) {
    items.push({ type, count: c, sharePct: Math.round((c / total) * 100) });
  }
  items.sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  const dominant = items[0]?.type ?? null;
  return { items: items.slice(0, 4), dominant };
}

// ─────────────────────────────────────────────────────────────────────
// Bloco 3 · Expressões recorrentes
// ─────────────────────────────────────────────────────────────────────

const KNOWN_EXPRESSIONS: ReadonlyArray<{
  key: string;
  display: string;
  type: RecurringExpressionItem["type"];
}> = [
  { key: "marketing digital", display: "Marketing digital", type: "topic" },
  { key: "inteligencia artificial", display: "Inteligência artificial", type: "topic" },
  { key: "redes sociais", display: "Redes sociais", type: "topic" },
  { key: "marca pessoal", display: "Marca pessoal", type: "topic" },
  { key: "negocio digital", display: "Negócio digital", type: "topic" },
  { key: "estrategia de conteudo", display: "Estratégia de conteúdo", type: "topic" },
  { key: "criacao de conteudo", display: "Criação de conteúdo", type: "topic" },
  { key: "newsletter", display: "Newsletter", type: "community" },
  { key: "subscreve", display: "Subscrever", type: "cta" },
  { key: "link na bio", display: "Link na bio", type: "cta" },
  { key: "envia dm", display: "Enviar DM", type: "cta" },
  { key: "comenta", display: "Comentar", type: "cta" },
  { key: "guarda este", display: "Guardar post", type: "cta" },
  { key: "partilha", display: "Partilhar", type: "cta" },
  { key: "seo", display: "SEO", type: "topic" },
  { key: "podcast", display: "Podcast", type: "product" },
  { key: "workshop", display: "Workshop", type: "product" },
  { key: "formacao", display: "Formação", type: "product" },
  { key: "comunidade", display: "Comunidade", type: "community" },
];

function buildRecurringExpressions(
  posts: readonly SnapshotPost[],
): RecurringExpressionItem[] {
  const counts = new Map<string, { count: number; display: string; type: RecurringExpressionItem["type"] }>();
  for (const p of posts) {
    const cap = normalize(cleanCaption(p.caption ?? ""));
    if (!cap) continue;
    for (const exp of KNOWN_EXPRESSIONS) {
      if (cap.includes(exp.key)) {
        const cur = counts.get(exp.key);
        if (cur) cur.count += 1;
        else counts.set(exp.key, { count: 1, display: exp.display, type: exp.type });
      }
    }
  }
  const out: RecurringExpressionItem[] = [];
  for (const [, v] of counts) {
    if (v.count >= 1) out.push({ expression: v.display, count: v.count, type: v.type });
  }
  out.sort((a, b) => b.count - a.count || a.expression.localeCompare(b.expression));
  return out.slice(0, 6);
}

// ─────────────────────────────────────────────────────────────────────
// Bloco 4 · CTA patterns
// ─────────────────────────────────────────────────────────────────────

const CTA_DETECTORS: ReadonlyArray<{
  type: DominantCtaType;
  label: string;
  terms: readonly string[];
}> = [
  {
    type: "newsletter",
    label: "Subscrever newsletter",
    terms: ["newsletter", "subscreve", "subscrever", "inscreve a newsletter"],
  },
  {
    type: "comment",
    label: "Comentar / responder",
    terms: ["comenta ", "comenta abaixo", "diz-me", "diz me", "responde"],
  },
  {
    type: "link",
    label: "Entrar no link",
    terms: ["link na bio", "link em bio", "clica no link", "no link da bio"],
  },
  {
    type: "message",
    label: "Enviar mensagem / DM",
    terms: ["envia dm", "dm para", "manda mensagem", "envia mensagem", " dm "],
  },
  {
    type: "save",
    label: "Guardar para mais tarde",
    terms: ["guarda este", "guarda para", "guarda este post", "save this"],
  },
  {
    type: "share",
    label: "Partilhar",
    terms: ["partilha com", "partilha este", "envia a alguem", "marca alguem"],
  },
];

function buildCtaPatterns(posts: readonly SnapshotPost[]): {
  hasCtaPct: number;
  hasQuestionPct: number;
  dominantCtaType: DominantCtaType;
  dominantCtaLabel: string;
} {
  if (posts.length === 0) {
    return { hasCtaPct: 0, hasQuestionPct: 0, dominantCtaType: "none", dominantCtaLabel: "Sem CTA detetado" };
  }
  let withCta = 0;
  let withQuestion = 0;
  const typeCounts = new Map<DominantCtaType, number>();
  for (const p of posts) {
    const raw = p.caption ?? "";
    const cap = normalize(cleanCaption(raw));
    let matched = false;
    for (const det of CTA_DETECTORS) {
      if (hasAny(cap, det.terms)) {
        typeCounts.set(det.type, (typeCounts.get(det.type) ?? 0) + 1);
        matched = true;
      }
    }
    if (matched) withCta += 1;
    if (raw.replace(/#\S+/g, " ").includes("?")) withQuestion += 1;
  }
  const hasCtaPct = Math.round((withCta / posts.length) * 100);
  const hasQuestionPct = Math.round((withQuestion / posts.length) * 100);

  let dominantType: DominantCtaType = "none";
  let dominantCount = 0;
  for (const [type, c] of typeCounts) {
    if (c > dominantCount) {
      dominantCount = c;
      dominantType = type;
    }
  }
  const dominantLabel =
    CTA_DETECTORS.find((d) => d.type === dominantType)?.label ??
    (dominantType === "none" ? "Sem CTA detetado" : "Outro");

  return {
    hasCtaPct,
    hasQuestionPct,
    dominantCtaType: dominantType,
    dominantCtaLabel: dominantLabel,
  };
}

function ctaSummary(b: {
  hasCtaPct: number;
  hasQuestionPct: number;
  dominantCtaType: DominantCtaType;
  dominantCtaLabel: string;
}): string {
  if (b.hasCtaPct === 0 && b.hasQuestionPct === 0) {
    return "Quase nenhuma legenda fecha com pergunta ou chamada à ação clara — o leitor termina o post sem próximo passo.";
  }
  if (b.dominantCtaType === "none") {
    return `Cerca de ${b.hasQuestionPct}% das legendas usam pergunta, mas não há um CTA dominante claro.`;
  }
  return `${b.hasCtaPct}% das legendas têm CTA; o padrão dominante é "${b.dominantCtaLabel.toLowerCase()}" e ${b.hasQuestionPct}% incluem pergunta.`;
}

// ─────────────────────────────────────────────────────────────────────
// Bloco 5 · Leitura editorial
// ─────────────────────────────────────────────────────────────────────

function buildEditorialReading(args: {
  dominantType: ContentTypeMixLabel | null;
  cta: { hasCtaPct: number; hasQuestionPct: number; dominantCtaLabel: string };
  avgLen: number;
  aiLanguageText: string | null;
}): EditorialReadingBlock {
  const { dominantType, cta, avgLen, aiLanguageText } = args;

  const whatItCommunicates =
    aiLanguageText && aiLanguageText.trim().length > 30
      ? aiLanguageText.trim()
      : describeCommunicates(dominantType, avgLen);

  const whatWorks = describeWorks(dominantType, avgLen, cta.hasQuestionPct);
  const whatIsMissing = describeMissing(cta);
  const recommendedImprovement = describeImprovement(cta);

  return {
    source: aiLanguageText && aiLanguageText.trim().length > 30 ? "ai" : "auto",
    whatItCommunicates,
    whatWorks,
    whatIsMissing,
    recommendedImprovement,
  };
}

function describeCommunicates(
  dominant: ContentTypeMixLabel | null,
  avgLen: number,
): string {
  const lengthHint =
    avgLen >= 250 ? "longas e explicativas" : avgLen >= 80 ? "médias" : "curtas e diretas";
  if (!dominant) {
    return `As legendas são ${lengthHint}, sem um eixo editorial dominante muito claro.`;
  }
  if (dominant === "Educativo") {
    return `As legendas têm uma função claramente educativa: explicam temas com profundidade em formatos ${lengthHint}.`;
  }
  if (dominant === "Convite / CTA") {
    return `As legendas funcionam sobretudo como convites — predominam chamadas à ação e formatos ${lengthHint}.`;
  }
  return `As legendas comunicam sobretudo no registo "${dominant.toLowerCase()}" e tendem a ser ${lengthHint}.`;
}

function describeWorks(
  dominant: ContentTypeMixLabel | null,
  avgLen: number,
  hasQuestionPct: number,
): string {
  if (dominant === "Educativo" && avgLen >= 150) {
    return "Há valor entregue: o leitor termina o post a aprender algo concreto.";
  }
  if (hasQuestionPct >= 30) {
    return "Boa parte das legendas convida ao diálogo, o que ajuda a sustentar comentários.";
  }
  if (dominant === "Bastidores / pessoal") {
    return "O tom pessoal aproxima a audiência e gera identificação.";
  }
  return "Há consistência editorial — o leitor reconhece de quem é o post.";
}

function describeMissing(cta: {
  hasCtaPct: number;
  hasQuestionPct: number;
}): string {
  if (cta.hasCtaPct < 20 && cta.hasQuestionPct < 20) {
    return "Falta o fecho: poucas legendas terminam com pergunta, convite à resposta ou próxima ação clara.";
  }
  if (cta.hasCtaPct < 30) {
    return "Os CTAs aparecem de forma esporádica — a conversão depende do leitor descobrir o próximo passo.";
  }
  if (cta.hasQuestionPct < 20) {
    return "Faltam perguntas claras a abrir o diálogo nos comentários.";
  }
  return "O ponto de melhoria não está nas legendas em si, mas na consistência da chamada à ação.";
}

function describeImprovement(cta: {
  hasCtaPct: number;
  hasQuestionPct: number;
  dominantCtaLabel: string;
}): string {
  if (cta.hasCtaPct < 20 && cta.hasQuestionPct < 20) {
    return "Adicionar uma pergunta clara no fim das legendas para abrir conversa.";
  }
  if (cta.hasCtaPct < 30) {
    return `Tornar o CTA mais explícito (ex.: ${cta.dominantCtaLabel.toLowerCase()}) em pelo menos 1 em cada 3 posts.`;
  }
  if (cta.hasQuestionPct < 20) {
    return "Acrescentar perguntas no fim das legendas para gerar comentários.";
  }
  return "Manter consistência da chamada à ação e testar formatos diferentes de pergunta.";
}

// ─────────────────────────────────────────────────────────────────────
// Builder principal
// ─────────────────────────────────────────────────────────────────────

export interface BuildCaptionIntelligenceArgs {
  posts: readonly SnapshotPost[];
  topThemes: readonly ThemeRow[];
  /** Hashtags já normalizadas (com ou sem `#`). Usadas só para deduplicar dos temas. */
  topHashtagLabels: ReadonlyArray<string>;
  /** Texto da leitura editorial vindo da IA (`aiInsightsV2.sections.language.text`). */
  aiLanguageText: string | null;
}

export function buildCaptionIntelligence(
  args: BuildCaptionIntelligenceArgs,
): CaptionIntelligence {
  const posts = args.posts.filter((p) => (p.caption ?? "").trim().length > 0);
  const sampleSize = posts.length;
  const available = sampleSize >= 4;

  const themes = buildThemes(args.topThemes, args.topHashtagLabels);
  const mix = buildContentTypeMix(posts);
  const expressions = buildRecurringExpressions(posts);
  const ctaRaw = buildCtaPatterns(posts);
  const cta: CtaPatternsBlock = {
    source: "auto",
    ...ctaRaw,
    summary: ctaSummary(ctaRaw),
  };

  const avgLen =
    posts.length > 0
      ? Math.round(posts.reduce((acc, p) => acc + captionLen(p), 0) / posts.length)
      : 0;

  const editorialReading = available
    ? buildEditorialReading({
        dominantType: mix.dominant,
        cta: ctaRaw,
        avgLen,
        aiLanguageText: args.aiLanguageText,
      })
    : {
        source: "auto" as const,
        whatItCommunicates:
          "Captions são curtas demais ou em número insuficiente para uma leitura semântica fiável.",
        whatWorks: "—",
        whatIsMissing: "—",
        recommendedImprovement: null,
      };

  return {
    sampleSize,
    available,
    themes: { source: "auto", items: themes },
    contentTypeMix: { source: "auto", items: mix.items, dominant: mix.dominant },
    recurringExpressions: { source: "extracted", items: expressions },
    ctaPatterns: cta,
    editorialReading,
  };
}