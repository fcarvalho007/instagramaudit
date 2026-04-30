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
    };
  }

  return {
    available: true,
    label: "Misto / pouco claro",
    sharePct: Math.round(share * 100),
    sampleSize: posts.length,
  };
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
    };
  }

  return {
    available: true,
    label: "Comunicação dispersa",
    sharePct: Math.round(share * 100),
    sampleSize: posts.length,
  };
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

  // Consistency: ≥ 60% sit in a single bucket
  const total = posts.length;
  const dominant = Math.max(short, mid, long);
  if (dominant / total < 0.5) {
    return {
      available: true,
      label: "Pouco consistentes",
      avgLength: Math.round(avg),
      ctaSharePct: Math.round(ctaShare * 100),
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
    sampleSize: total,
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