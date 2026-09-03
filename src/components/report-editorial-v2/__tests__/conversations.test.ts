import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { CommentIntelligence } from "@/lib/analysis/types";
import type { AdapterResult, SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import {
  buildConversationCounts,
  buildConversationObservations,
  buildConversationReading,
  buildEditorialConversationsData,
} from "../conversations/conversations-data";
import { conversationsIntro } from "../conversations/editorial-conversations";

const root = process.cwd();
const componentSrc = readFileSync(
  resolve(root, "src/components/report-editorial-v2/conversations/editorial-conversations.tsx"),
  "utf8",
);
const shellSrc = readFileSync(
  resolve(root, "src/components/report-editorial-v2/editorial-v2-shell.tsx"),
  "utf8",
);

function payload(posts: Array<Partial<{ comments: number | null }>>): SnapshotPayload {
  return {
    posts: posts.map((p, i) => ({
      id: `p${i}`,
      taken_at_iso: `2026-08-0${(i % 9) + 1}T10:00:00.000Z`,
      thumbnail_url: `https://cdn.example/${i}.jpg`,
      permalink: `https://instagram.com/p/${i}`,
      ...p,
    })),
  } as SnapshotPayload;
}

function result(ci: CommentIntelligence | null): AdapterResult {
  return { enriched: { commentIntelligence: ci } } as unknown as AdapterResult;
}

function intelligence(over: Partial<CommentIntelligence> = {}): CommentIntelligence {
  return {
    available: true,
    source: "apify_comments",
    samplePosts: 4,
    sampleComments: 21,
    sampleReplies: 0,
    ownerUsername: "marca",
    ownerRepliesCount: 0,
    ownerReplyRatePct: 0,
    postsWithOwnerReplyPct: 0,
    audienceCommentsCount: 21,
    uniqueAudienceCommentersCount: 17,
    postsWithConversationPct: 0,
    questionsFromAudienceCount: 3,
    praiseCount: 5,
    complaintOrIssueCount: 0,
    buyingIntentCount: 2,
    spamOrLowQualityCount: 0,
    dominantConversationSignals: [],
    recommendedConversationAction: "Responder às perguntas mais frequentes.",
    limitations: [],
    ...(over as object),
  } as CommentIntelligence;
}

describe("Conversas — estados e distinção entre zero e em falta", () => {
  it("zero confirmado só quando todas as contagens são conhecidas e 0", () => {
    const data = buildEditorialConversationsData(
      result(null),
      payload([{ comments: 0 }, { comments: 0 }, { comments: 0 }]),
    );
    expect(data.state).toBe("zero_confirmed");
    expect(buildConversationObservations(data)[0]).toBe(
      "Nenhuma das 3 publicações analisadas recebeu comentários públicos.",
    );
  });

  it("contagens em falta nunca produzem estado zero", () => {
    const missing = buildEditorialConversationsData(
      result(null),
      payload([{ comments: null }, { comments: null }]),
    );
    expect(missing.state).toBe("unavailable");

    const partial = buildEditorialConversationsData(
      result(null),
      payload([{ comments: 0 }, { comments: null }]),
    );
    expect(partial.state).toBe("unavailable");
    expect(buildConversationObservations(partial).join(" ")).not.toContain(
      "Nenhuma das",
    );
  });

  it("payload ausente é indisponível, não zero", () => {
    const data = buildEditorialConversationsData(result(null), undefined);
    expect(data.state).toBe("unavailable");
    expect(data.counts.totalComments).toBe(0);
    expect(data.counts.averageComments).toBeNull();
  });

  it("comentários sem enriquecimento não inventam insights de audiência", () => {
    const data = buildEditorialConversationsData(
      result(null),
      payload([{ comments: 4 }, { comments: 0 }, { comments: 2 }]),
    );
    expect(data.state).toBe("counts_only");
    expect(data.hasIntelligence).toBe(false);
    expect(buildConversationReading(data)).toBeNull();
    const obs = buildConversationObservations(data).join(" ");
    expect(obs).toContain("2 das 3 publicações");
    expect(obs).toContain("6 comentários públicos");
    expect(obs).not.toMatch(/pergunta|objeç|intenç|sentimento/i);
  });

  it("números são dinâmicos face aos inputs reais", () => {
    const a = buildConversationCounts(payload([{ comments: 4 }, { comments: 6 }]));
    const b = buildConversationCounts(payload([{ comments: 1 }, { comments: 1 }, { comments: 1 }]));
    expect(a.totalComments).toBe(10);
    expect(a.averageComments).toBe(5);
    expect(b.totalComments).toBe(3);
    expect(b.postsWithKnownCount).toBe(3);
    expect(a.mostCommentedPost?.commentsCount).toBe(6);
    expect(a.mostCommentedPost?.thumbnailUrl).toBe("https://cdn.example/1.jpg");
  });

  it("enriquecimento presente usa apenas valores reais", () => {
    const data = buildEditorialConversationsData(
      result(intelligence()),
      payload([{ comments: 10 }, { comments: 11 }]),
    );
    expect(data.state).toBe("intelligence");
    const obs = buildConversationObservations(data).join(" ");
    expect(obs).toContain("cobriu 4 publicações e 21 comentários");
    const reading = buildConversationReading(data);
    expect(reading?.hypothesis).toContain("3 perguntas da audiência");
    expect(reading?.hypothesis).toContain("2 sinais de intenção de compra");
  });

  it("respostas zero difere de respostas não mensuráveis", () => {
    const zero = buildEditorialConversationsData(
      result(intelligence({ repliesMeasurable: true, sampleReplies: 0 })),
      payload([{ comments: 21 }]),
    );
    const unknown = buildEditorialConversationsData(
      result(intelligence({ repliesMeasurable: false })),
      payload([{ comments: 21 }]),
    );
    expect(zero.repliesMeasurable).toBe(true);
    expect(unknown.repliesMeasurable).toBe(false);
  });

  it("enriquecimento indisponível/pendente mantém estado verdadeiro", () => {
    const pending = buildEditorialConversationsData(
      result(intelligence({ available: false, reason: "processing" })),
      payload([{ comments: null }]),
    );
    expect(pending.state).toBe("unavailable");
    expect(pending.hasIntelligence).toBe(false);
    expect(pending.unavailableReason).toBe("processing");
  });

  it("snapshot antigo Free sem enriquecimento visto em Pro mostra contagens sem insights", () => {
    const data = buildEditorialConversationsData(
      result(null),
      payload([{ comments: 3 }, { comments: 5 }]),
    );
    expect(data.state).toBe("counts_only");
    expect(data.intelligence).toBeNull();
  });
});

describe("Conversas — copy honesta", () => {
  it("só promete leitura de comentários quando há enriquecimento", () => {
    const withCi = conversationsIntro(
      buildEditorialConversationsData(result(intelligence()), payload([{ comments: 21 }])),
    );
    expect(withCi.title).toBe("O que revelam os comentários");

    const countsOnly = conversationsIntro(
      buildEditorialConversationsData(result(null), payload([{ comments: 3 }])),
    );
    expect(countsOnly.title).not.toContain("revelam os comentários");
    expect(countsOnly.subtitle).not.toMatch(/Lemos os comentários/i);
  });
});

describe("Conversas — proveniência e fronteiras", () => {
  it("não usa números da referência HTML nem dados mock", () => {
    expect(componentSrc).not.toMatch(/report-mock-data|fixture|placeholder/i);
    expect(componentSrc).not.toMatch(/Sem dados para analisar/);
    expect(componentSrc).not.toMatch(/\b12 publicações\b/);
  });

  it("não faz fetch, nem chamadas de enriquecimento/IA durante o render", () => {
    expect(componentSrc).not.toMatch(/fetch\(|useQuery|useServerFn|unlock|enqueue|openai/i);
  });

  it("usa o pipeline existente de thumbnails com fallback", () => {
    const dataSrc = readFileSync(
      resolve(root, "src/components/report-editorial-v2/conversations/conversations-data.ts"),
      "utf8",
    );
    expect(dataSrc).toContain("pickThumbnailUrl");
    expect(componentSrc).toContain("sem imagem disponível");
  });

  it("reutiliza a classificação de produção em vez de criar outra", () => {
    expect(componentSrc).toContain(
      'from "@/components/report-redesign/v2/report-comment-intelligence"',
    );
    expect(componentSrc).toContain("classifyBrandReply");
  });

  it("detalhe técnico só em internal_lab", () => {
    expect(componentSrc).toContain('features.debugLabels !== "hidden"');
    expect(componentSrc).toContain("showTechnicalDetail && data.unavailableReason");
  });

  it("o gating do shell espelha produção (lead ou Pro)", () => {
    expect(shellSrc).toMatch(/\{\(leadCaptured \|\| premiumUnlocked\) && \(\s*<EditorialConversations/);
    expect(shellSrc.match(/<EditorialConversations/g)).toHaveLength(1);
  });

  it("a produção por defeito continua a usar o seu próprio componente", () => {
    const prodShell = readFileSync(
      resolve(root, "src/components/report-redesign/v2/report-shell-v2.tsx"),
      "utf8",
    );
    expect(prodShell.match(/<CommentIntelligenceSection/g)).toHaveLength(1);
    expect(prodShell).not.toContain("EditorialConversations");
  });
});
