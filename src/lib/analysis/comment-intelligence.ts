/**
 * Pure aggregation logic for comment-level intelligence.
 * No I/O — receives raw Apify comment data, returns CommentIntelligence.
 * Raw comment objects are never persisted (GDPR-safe).
 */

import type { CommentIntelligence } from "./types";

// ─────────────────────────────────────────────────────────────────────
// Apify comment scraper output shape (loose)
// ─────────────────────────────────────────────────────────────────────

export interface RawApifyComment {
  id?: string;
  text?: string;
  ownerUsername?: string;
  timestamp?: string;
  likesCount?: number;
  repliesCount?: number;
  replies?: RawApifyComment[];
}

export interface PostCommentBatch {
  /** The permalink of the post these comments belong to. */
  postUrl: string;
  /** Raw comments returned by the Apify actor for this post. */
  comments: RawApifyComment[];
}

// ─────────────────────────────────────────────────────────────────────
// Signal classification (heuristic, transient — text never persisted)
// ─────────────────────────────────────────────────────────────────────

/** Classify a comment's text into a signal category. */
function classifySignal(text: string | undefined): "question" | "praise" | "complaint" | "buying_intent" | "spam" | null {
  if (!text) return null;
  const t = text.toLowerCase().trim();
  if (t.length < 2) return null;

  // Spam / low quality — emoji-only, single word, or tag-only
  if (/^[\p{Emoji}\s]+$/u.test(t) && t.length < 10) return "spam";
  if (/^@\w+\s*$/.test(t)) return "spam";
  if (t.length < 4 && !/\?/.test(t)) return "spam";

  // Question
  if (/\?/.test(t)) return "question";
  if (/^(como|onde|quando|qual|quanto|por ?qu[eê]|what|where|when|how|which|why|can you|do you)/i.test(t)) return "question";

  // Buying intent
  if (/(comprar|preço|quanto custa|encomend|ship|deliver|buy|purchase|price|order|link\s*(na\s*bio|in\s*bio)?|onde (posso |se )?(compra|encontr)|how (much|to (buy|order|get)))/i.test(t)) return "buying_intent";

  // Complaint / issue
  if (/(não funciona|péssim[oa]|horrível|decepcion|desapon|problema|broken|worst|terrible|disappointing|doesn'?t work|scam|fraud|reclam)/i.test(t)) return "complaint";

  // Praise
  if (/(parabéns|incrível|maravilhos[oa]|lindíssim|perfeito|excelente|fantástic|amazing|beautiful|gorgeous|perfect|love this|wonderful|stunning|great|awesome|👏|🔥|❤️|😍|💯)/i.test(t)) return "praise";

  return null;
}

// ─────────────────────────────────────────────────────────────────────
// Core aggregation
// ─────────────────────────────────────────────────────────────────────

const BASE_LIMITATIONS: string[] = [
  "Análise de comentários públicos — não inclui DMs.",
  "Não inclui comentários ocultos, apagados ou visíveis apenas com login.",
  "Resultados podem variar conforme o que está publicamente acessível.",
];

const LIMITATION_NO_PER_POST =
  "Granularidade por publicação indisponível — métricas agregadas globalmente.";

function normalizeUsername(u: string): string {
  return u.toLowerCase().trim().replace(/^@/, "");
}

export interface AggregateOptions {
  /** Whether comments were successfully grouped per post. Default true. */
  groupedByPost?: boolean;
}

/**
 * Build an unavailable CommentIntelligence with a reason code.
 */
export function buildUnavailableCommentIntelligence(
  profileUsername: string,
  reason: NonNullable<CommentIntelligence["reason"]>,
): CommentIntelligence {
  return {
    available: false,
    source: "apify_comments",
    reason,
    samplePosts: 0,
    sampleComments: 0,
    sampleReplies: 0,
    ownerUsername: profileUsername,
    ownerRepliesCount: 0,
    ownerReplyRatePct: 0,
    postsWithOwnerReplyPct: 0,
    audienceCommentsCount: 0,
    uniqueAudienceCommentersCount: 0,
    postsWithConversationPct: 0,
    questionsFromAudienceCount: 0,
    praiseCount: 0,
    complaintOrIssueCount: 0,
    buyingIntentCount: 0,
    spamOrLowQualityCount: 0,
    dominantConversationSignals: [],
    recommendedConversationAction: "",
    limitations: [...BASE_LIMITATIONS],
  };
}

export function aggregateCommentIntelligence(
  profileUsername: string,
  batches: PostCommentBatch[],
  options?: AggregateOptions,
): CommentIntelligence {
  const owner = normalizeUsername(profileUsername);
  const groupedByPost = options?.groupedByPost ?? true;

  let totalComments = 0;
  let totalReplies = 0;
  let totalOwnerActions = 0;
  let totalAudienceComments = 0;
  let postsWithOwnerReply = 0;
  let postsWithConversation = 0;

  const uniqueCommenters = new Set<string>();

  // Signal counters
  let questionsCount = 0;
  let praiseCount = 0;
  let complaintCount = 0;
  let buyingIntentCount = 0;
  let spamCount = 0;

  // Excerpt collectors (max 5 per category)
  const MAX_EXCERPTS = 5;
  const excerptQuestions: Array<{ username: string; text: string }> = [];
  const excerptPraise: Array<{ username: string; text: string }> = [];
  const excerptComplaints: Array<{ username: string; text: string }> = [];
  const excerptBuyingIntent: Array<{ username: string; text: string }> = [];

  function pushExcerpt(
    arr: Array<{ username: string; text: string }>,
    username: string,
    text: string | undefined,
  ) {
    if (arr.length >= MAX_EXCERPTS || !text) return;
    const safeUsername = username && username.trim().length > 0 ? username.trim() : "utilizador";
    arr.push({ username: safeUsername, text: text.slice(0, 120) });
  }

  // Top 2 posts by audience comment count
  let topCommentPostsList: Array<{ postUrl: string; commentsCount: number }> = [];

  let topPost: {
    postUrl: string;
    commentsCount: number;
    ownerRepliesCount: number;
  } | undefined;

  // Pro-grade per-post stats (top 3) — collected alongside the legacy loop
  interface PerPostStats {
    postUrl: string;
    commentsCount: number;
    ownerRepliesCount: number;
    audienceCommentsCount: number;
    questions: number;
    praise: number;
    complaints: number;
    buyingIntent: number;
    longestAudienceComment?: { username: string; text: string };
  }
  const perPost: PerPostStats[] = [];

  for (const batch of batches) {
    let postOwnerReplies = 0;
    let postCommentCount = 0;
    let postHasConversation = false;
    const postStats: PerPostStats = {
      postUrl: batch.postUrl,
      commentsCount: 0,
      ownerRepliesCount: 0,
      audienceCommentsCount: 0,
      questions: 0,
      praise: 0,
      complaints: 0,
      buyingIntent: 0,
    };
    function trackAudience(username: string, text: string | undefined, signal: ReturnType<typeof classifySignal>) {
      postStats.audienceCommentsCount++;
      if (signal === "question") postStats.questions++;
      else if (signal === "praise") postStats.praise++;
      else if (signal === "complaint") postStats.complaints++;
      else if (signal === "buying_intent") postStats.buyingIntent++;
      // Track longest classified excerpt as "topAudienceComment" candidate.
      // Mirrors `classifiedExcerpts`: only stored when signal classification
      // matched, so the GDPR contract (no raw uncategorised text) holds.
      const isClassified =
        signal === "question" ||
        signal === "praise" ||
        signal === "complaint" ||
        signal === "buying_intent";
      if (isClassified && text && text.trim().length >= 12) {
        const trimmed = text.trim().slice(0, 140);
        if (!postStats.longestAudienceComment || trimmed.length > postStats.longestAudienceComment.text.length) {
          const safeUsername = username && username.trim().length > 0 ? username.trim() : "utilizador";
          postStats.longestAudienceComment = { username: safeUsername, text: trimmed };
        }
      }
    }

    for (const comment of batch.comments) {
      const commentOwner = normalizeUsername(comment.ownerUsername ?? "");
      const isOwner = commentOwner === owner;

      if (isOwner) {
        postOwnerReplies++;
      } else {
        totalAudienceComments++;
        if (commentOwner) uniqueCommenters.add(commentOwner);

        // Classify signal (text used transiently, never persisted)
        const signal = classifySignal(comment.text);
        if (signal === "question") { questionsCount++; pushExcerpt(excerptQuestions, comment.ownerUsername ?? "", comment.text); }
        else if (signal === "praise") { praiseCount++; pushExcerpt(excerptPraise, comment.ownerUsername ?? "", comment.text); }
        else if (signal === "complaint") { complaintCount++; pushExcerpt(excerptComplaints, comment.ownerUsername ?? "", comment.text); }
        else if (signal === "buying_intent") { buyingIntentCount++; pushExcerpt(excerptBuyingIntent, comment.ownerUsername ?? "", comment.text); }
        else if (signal === "spam") spamCount++;
        trackAudience(comment.ownerUsername ?? "", comment.text, signal);
      }
      postCommentCount++;
      totalComments++;

      // Process replies — count towards totalComments too
      if (Array.isArray(comment.replies)) {
        for (const reply of comment.replies) {
          const replyOwner = normalizeUsername(reply.ownerUsername ?? "");
          totalReplies++;
          totalComments++;

          if (replyOwner === owner) {
            postOwnerReplies++;
            postHasConversation = true;
          } else {
            totalAudienceComments++;
            if (replyOwner) uniqueCommenters.add(replyOwner);

            const signal = classifySignal(reply.text);
            if (signal === "question") { questionsCount++; pushExcerpt(excerptQuestions, reply.ownerUsername ?? "", reply.text); }
            else if (signal === "praise") { praiseCount++; pushExcerpt(excerptPraise, reply.ownerUsername ?? "", reply.text); }
            else if (signal === "complaint") { complaintCount++; pushExcerpt(excerptComplaints, reply.ownerUsername ?? "", reply.text); }
            else if (signal === "buying_intent") { buyingIntentCount++; pushExcerpt(excerptBuyingIntent, reply.ownerUsername ?? "", reply.text); }
            else if (signal === "spam") spamCount++;
            trackAudience(reply.ownerUsername ?? "", reply.text, signal);
          }
        }
      }
    }

    totalOwnerActions += postOwnerReplies;

    if (postOwnerReplies > 0) {
      postsWithOwnerReply++;
    }
    if (postHasConversation) {
      postsWithConversation++;
    }

    // Track top conversation post (only meaningful when grouped)
    if (groupedByPost) {
      if (!topPost || postOwnerReplies > topPost.ownerRepliesCount) {
        topPost = {
          postUrl: batch.postUrl,
          commentsCount: postCommentCount,
          ownerRepliesCount: postOwnerReplies,
        };
      }
      // Track top 2 by audience comment count
      const audienceCommentsInPost = postCommentCount - postOwnerReplies;
      topCommentPostsList.push({ postUrl: batch.postUrl, commentsCount: audienceCommentsInPost });
      postStats.commentsCount = postCommentCount;
      postStats.ownerRepliesCount = postOwnerReplies;
      perPost.push(postStats);
    }
  }

  // Sort and keep top 2
  topCommentPostsList = topCommentPostsList
    .filter((p) => p.commentsCount > 0)
    .sort((a, b) => b.commentsCount - a.commentsCount)
    .slice(0, 2);

  // Top 3 conversation posts, ranked by ownerReplies + audienceComments
  const topConversationPosts = perPost
    .filter((p) => p.audienceCommentsCount + p.ownerRepliesCount > 0)
    .sort(
      (a, b) =>
        (b.ownerRepliesCount + b.audienceCommentsCount) -
        (a.ownerRepliesCount + a.audienceCommentsCount),
    )
    .slice(0, 3)
    .map((p) => {
      const dominantSignal = pickDominantSignal(p);
      return {
        postUrl: p.postUrl,
        shortcode: extractShortcode(p.postUrl),
        commentsCount: p.commentsCount,
        ownerRepliesCount: p.ownerRepliesCount,
        audienceCommentsCount: p.audienceCommentsCount,
        dominantSignal,
        ...(p.longestAudienceComment ? { topAudienceComment: p.longestAudienceComment } : {}),
        summary: buildPostSummary(p),
      } as NonNullable<CommentIntelligence["topConversationPosts"]>[number];
    });

  const samplePosts = batches.length;
  const ownerReplyRatePct =
    totalAudienceComments > 0
      ? Math.round((totalOwnerActions / totalAudienceComments) * 1000) / 10
      : 0;

  const postsWithOwnerReplyPct =
    samplePosts > 0 && groupedByPost
      ? Math.round((postsWithOwnerReply / samplePosts) * 1000) / 10
      : 0;

  const postsWithConversationPct =
    samplePosts > 0 && groupedByPost
      ? Math.round((postsWithConversation / samplePosts) * 1000) / 10
      : 0;

  // Build dominant signals (ordered by frequency, top 3)
  const signalCounts: Array<[string, number]> = [
    ["praise", praiseCount],
    ["questions", questionsCount],
    ["complaint", complaintCount],
    ["buying_intent", buyingIntentCount],
    ["spam", spamCount],
  ];
  const dominantConversationSignals = signalCounts
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([label]) => label);

  // Recommended action
  const recommendedConversationAction = deriveRecommendation(
    ownerReplyRatePct,
    totalAudienceComments,
    questionsCount,
    complaintCount,
    buyingIntentCount,
  );

  // Build limitations list
  const limitations = [...BASE_LIMITATIONS];
  if (!groupedByPost) {
    limitations.push(LIMITATION_NO_PER_POST);
  }

  return {
    available: true,
    source: "apify_comments",
    samplePosts,
    sampleComments: totalComments,
    sampleReplies: totalReplies,
    ownerUsername: profileUsername,
    ownerRepliesCount: totalOwnerActions,
    ownerReplyRatePct,
    postsWithOwnerReplyPct,
    audienceCommentsCount: totalAudienceComments,
    uniqueAudienceCommentersCount: uniqueCommenters.size,
    postsWithConversationPct,
    questionsFromAudienceCount: questionsCount,
    praiseCount,
    complaintOrIssueCount: complaintCount,
    buyingIntentCount,
    spamOrLowQualityCount: spamCount,
    dominantConversationSignals,
    recommendedConversationAction,
    topConversationPost:
      topPost && topPost.ownerRepliesCount > 0 ? topPost : undefined,
    classifiedExcerpts:
      (excerptQuestions.length > 0 || excerptPraise.length > 0 || excerptComplaints.length > 0 || excerptBuyingIntent.length > 0)
        ? { questions: excerptQuestions, praise: excerptPraise, complaints: excerptComplaints, buyingIntent: excerptBuyingIntent }
        : undefined,
    topCommentPosts: topCommentPostsList.length > 0 ? topCommentPostsList : undefined,
    topConversationPosts: topConversationPosts.length > 0 ? topConversationPosts : undefined,
    limitations,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Helpers for top conversation posts
// ─────────────────────────────────────────────────────────────────────

function extractShortcode(postUrl: string): string | undefined {
  // https://www.instagram.com/p/<shortcode>/  or  /reel/<shortcode>/
  const m = postUrl.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m?.[1];
}

function pickDominantSignal(p: {
  questions: number;
  praise: number;
  complaints: number;
  buyingIntent: number;
}): "questions" | "praise" | "complaints" | "buying_intent" | "mixed" {
  const entries: Array<["questions" | "praise" | "complaints" | "buying_intent", number]> = [
    ["questions", p.questions],
    ["praise", p.praise],
    ["complaints", p.complaints],
    ["buying_intent", p.buyingIntent],
  ];
  const total = entries.reduce((s, [, n]) => s + n, 0);
  if (total === 0) return "mixed";
  const sorted = entries.filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return "mixed";
  const [topKey, topCount] = sorted[0]!;
  // If top signal is < 50% of classified, it's mixed
  if (topCount / total < 0.5) return "mixed";
  return topKey;
}

function buildPostSummary(p: {
  audienceCommentsCount: number;
  ownerRepliesCount: number;
  questions: number;
  praise: number;
  complaints: number;
  buyingIntent: number;
}): string {
  const parts: string[] = [];
  const total = p.audienceCommentsCount;
  if (total > 0) {
    parts.push(`${total} ${total === 1 ? "comentário" : "comentários"} da audiência`);
  }
  const classifiedBits: string[] = [];
  if (p.questions > 0) classifiedBits.push(`${p.questions} ${p.questions === 1 ? "pergunta" : "perguntas"}`);
  if (p.buyingIntent > 0) classifiedBits.push(`${p.buyingIntent} c/ intenção de compra`);
  if (p.complaints > 0) classifiedBits.push(`${p.complaints} ${p.complaints === 1 ? "queixa" : "queixas"}`);
  if (p.praise > 0 && classifiedBits.length < 2) classifiedBits.push(`${p.praise} ${p.praise === 1 ? "elogio" : "elogios"}`);
  if (classifiedBits.length > 0) {
    parts.push(classifiedBits.slice(0, 2).join(" e "));
  }
  const replyBit =
    p.ownerRepliesCount > 0
      ? `${p.ownerRepliesCount} ${p.ownerRepliesCount === 1 ? "resposta" : "respostas"} da marca`
      : "sem resposta da marca";
  parts.push(replyBit);
  return parts.join(" · ");
}

// ─────────────────────────────────────────────────────────────────────
// Recommendation engine (heuristic)
// ─────────────────────────────────────────────────────────────────────

function deriveRecommendation(
  replyRatePct: number,
  audienceComments: number,
  questions: number,
  complaints: number,
  buyingIntent: number,
): string {
  if (audienceComments === 0) {
    return "Sem comentários de audiência suficientes para gerar recomendação.";
  }
  if (complaints > 0 && replyRatePct < 20) {
    return "Existem reclamações sem resposta — priorizar gestão de crise nos comentários.";
  }
  if (buyingIntent > 0 && replyRatePct < 30) {
    return "Detetada intenção de compra sem resposta — responder pode converter seguidores em clientes.";
  }
  if (questions > audienceComments * 0.3 && replyRatePct < 30) {
    return "Muitas perguntas sem resposta — responder aumenta confiança e engagement.";
  }
  if (replyRatePct < 10) {
    return "Taxa de resposta muito baixa — iniciar respostas regulares para construir comunidade.";
  }
  if (replyRatePct < 30) {
    return "Taxa de resposta moderada — aumentar frequência de resposta nos posts com mais interação.";
  }
  return "Boa presença nos comentários — manter consistência e priorizar perguntas e feedback.";
}
