import type { AdapterResult, SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import type { CommentIntelligence } from "@/lib/analysis/types";
import { pickThumbnailUrl } from "@/lib/report/pick-thumbnail";
import { repliesAreMeasurable } from "@/components/report-redesign/v2/report-comment-intelligence";

/**
 * Adaptador de APRESENTAÇÃO das Conversas (Editorial V2, Fase F).
 *
 * Lê apenas dados já carregados:
 *   - `payload.posts[].comments` (contagem real por publicação; `null`
 *     significa DESCONHECIDO e nunca é convertido em zero);
 *   - `result.enriched.commentIntelligence` (enriquecimento persistido).
 *
 * Sem I/O, sem IA, sem novo algoritmo de análise de comentários e sem
 * qualquer valor proveniente da referência visual.
 */

export type ConversationsState =
  /** Enriquecimento real disponível. */
  | "intelligence"
  /** Todos os posts da amostra confirmam 0 comentários. */
  | "zero_confirmed"
  /** Há comentários contados, mas sem análise aprofundada. */
  | "counts_only"
  /** Sem dados fiáveis de comentários. */
  | "unavailable";

export interface CommentedPost {
  id: string;
  date: string;
  commentsCount: number;
  thumbnailUrl: string | null;
  permalink: string | null;
}

export interface ConversationsCounts {
  /** Publicações da amostra com contagem de comentários conhecida. */
  postsWithKnownCount: number;
  /** Publicações da amostra sem contagem conhecida (`null`/ausente). */
  postsWithUnknownCount: number;
  /** Total de publicações na amostra carregada. */
  totalPosts: number;
  /** Soma dos comentários conhecidos. */
  totalComments: number;
  /** Publicações com pelo menos 1 comentário. */
  postsWithComments: number;
  /** Média por publicação com contagem conhecida (1 casa decimal). */
  averageComments: number | null;
  /** Publicação mais comentada, quando existe pelo menos um comentário. */
  mostCommentedPost: CommentedPost | null;
}

export interface EditorialConversationsData {
  state: ConversationsState;
  counts: ConversationsCounts;
  intelligence: CommentIntelligence | null;
  /** Só verdadeiro quando o enriquecimento existe e está disponível. */
  hasIntelligence: boolean;
  /** Replies mensuráveis — só relevante com enriquecimento. */
  repliesMeasurable: boolean;
  /** Motivo bruto de indisponibilidade (detalhe técnico, não público). */
  unavailableReason: CommentIntelligence["reason"] | null;
}

function formatDatePt(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-PT", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(d);
}

export function buildConversationCounts(
  payload?: SnapshotPayload,
): ConversationsCounts {
  const posts = Array.isArray(payload?.posts) ? payload!.posts! : [];

  let known = 0;
  let unknown = 0;
  let total = 0;
  let withComments = 0;
  let top: CommentedPost | null = null;

  posts.forEach((p, idx) => {
    const raw = p?.comments;
    if (typeof raw !== "number" || !Number.isFinite(raw) || raw < 0) {
      unknown += 1;
      return;
    }
    known += 1;
    total += raw;
    if (raw > 0) {
      withComments += 1;
      if (!top || raw > top.commentsCount) {
        top = {
          id: p.id ?? p.shortcode ?? `post-${idx}`,
          date: formatDatePt(p.taken_at_iso),
          commentsCount: raw,
          thumbnailUrl: pickThumbnailUrl(p),
          permalink: typeof p.permalink === "string" ? p.permalink : null,
        };
      }
    }
  });

  return {
    postsWithKnownCount: known,
    postsWithUnknownCount: unknown,
    totalPosts: posts.length,
    totalComments: total,
    postsWithComments: withComments,
    averageComments: known > 0 ? Math.round((total / known) * 10) / 10 : null,
    mostCommentedPost: top,
  };
}

export function buildEditorialConversationsData(
  result: AdapterResult,
  payload?: SnapshotPayload,
): EditorialConversationsData {
  const ci = result.enriched.commentIntelligence ?? null;
  const hasIntelligence = Boolean(ci?.available);
  const counts = buildConversationCounts(payload);

  let state: ConversationsState;
  if (hasIntelligence) {
    state = "intelligence";
  } else if (counts.postsWithKnownCount === 0) {
    // Nenhuma contagem fiável — nunca mostrar zero.
    state = "unavailable";
  } else if (counts.totalComments > 0) {
    state = "counts_only";
  } else if (counts.postsWithUnknownCount === 0) {
    // Todas as publicações confirmam 0 comentários.
    state = "zero_confirmed";
  } else {
    state = "unavailable";
  }

  return {
    state,
    counts,
    intelligence: ci,
    hasIntelligence,
    repliesMeasurable: ci ? repliesAreMeasurable(ci) : false,
    unavailableReason: ci?.reason ?? null,
  };
}

/** Factos — apenas quando cada número vem de dados reais. */
export function buildConversationObservations(
  data: EditorialConversationsData,
): string[] {
  const { counts } = data;
  const out: string[] = [];

  if (counts.postsWithKnownCount === 0) return out;

  if (data.state === "zero_confirmed") {
    out.push(
      `Nenhuma das ${counts.postsWithKnownCount} publicações analisadas recebeu comentários públicos.`,
    );
    return out;
  }

  out.push(
    `${counts.postsWithComments} das ${counts.postsWithKnownCount} publicações analisadas receberam pelo menos um comentário.`,
  );
  out.push(
    `Foram observados ${counts.totalComments} comentários públicos nessas publicações.`,
  );
  if (counts.mostCommentedPost) {
    out.push(
      `A publicação com mais comentários recebeu ${counts.mostCommentedPost.commentsCount}.`,
    );
  }
  if (counts.postsWithUnknownCount > 0) {
    out.push(
      `${counts.postsWithUnknownCount} publicações não têm contagem de comentários disponível.`,
    );
  }

  if (data.state === "intelligence" && data.intelligence) {
    const ci = data.intelligence;
    out.push(
      `A análise de comentários cobriu ${ci.samplePosts} publicações e ${ci.audienceCommentsCount} comentários da audiência.`,
    );
  }

  return out;
}

/**
 * Leitura interpretativa. Devolve `null` quando não existe leitura segura —
 * uma secção factual sem leitura é preferível a uma leitura inventada.
 */
export function buildConversationReading(
  data: EditorialConversationsData,
): { hypothesis: string; confidence: "baixa" | "média" | "alta" } | null {
  if (data.state === "zero_confirmed") {
    return {
      hypothesis:
        "Sem comentários públicos, ainda não há sinais suficientes para interpretar perguntas, objeções ou intenção da audiência.",
      confidence: "baixa",
    };
  }

  if (data.state === "intelligence" && data.intelligence) {
    const ci = data.intelligence;
    const parts: string[] = [];
    if (ci.questionsFromAudienceCount > 0) {
      parts.push(
        `${ci.questionsFromAudienceCount} perguntas da audiência`,
      );
    }
    if (ci.buyingIntentCount > 0) {
      parts.push(`${ci.buyingIntentCount} sinais de intenção de compra`);
    }
    if (ci.complaintOrIssueCount > 0) {
      parts.push(`${ci.complaintOrIssueCount} comentários com queixa ou problema`);
    }
    if (parts.length === 0) return null;

    const base = `Entre os comentários analisados surgem ${parts.join(", ")}.`;
    const caveat = ci.lowConfidence
      ? " A amostra é pequena, por isso esta leitura deve ser vista como indicativa."
      : " Esta leitura cobre apenas os comentários públicos recolhidos nesta amostra.";
    return { hypothesis: base + caveat, confidence: ci.lowConfidence ? "baixa" : "média" };
  }

  return null;
}
