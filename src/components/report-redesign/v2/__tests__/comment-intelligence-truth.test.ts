import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { CommentIntelligence } from "@/lib/analysis/types";
import {
  classifyBrandReply,
  repliesAreMeasurable,
} from "../report-comment-intelligence";

const root = process.cwd();
const src = readFileSync(
  resolve(root, "src/components/report-redesign/v2/report-comment-intelligence.tsx"),
  "utf8",
);
const pt = JSON.parse(
  readFileSync(resolve(root, "src/i18n/locales/pt/report.json"), "utf8"),
) as Record<string, any>;

const t = (key: string) => key;

function base(overrides: Partial<CommentIntelligence> = {}): CommentIntelligence {
  return {
    available: true,
    source: "apify_comments",
    samplePosts: 5,
    sampleComments: 20,
    sampleReplies: 0,
    ownerUsername: "marca",
    ownerRepliesCount: 0,
    ownerReplyRatePct: 0,
    postsWithOwnerReplyPct: 0,
    audienceCommentsCount: 20,
    uniqueAudienceCommentersCount: 18,
    postsWithConversationPct: 0,
    questionsFromAudienceCount: 3,
    praiseCount: 4,
    complaintOrIssueCount: 1,
    buyingIntentCount: 1,
    spamOrLowQualityCount: 0,
    limitations: [],
    ...(overrides as object),
  } as CommentIntelligence;
}

describe("classifyBrandReply — contrato de mensurabilidade", () => {
  it("com replies mensuráveis mantém os veredictos existentes", () => {
    expect(
      classifyBrandReply(
        base({ repliesMeasurable: true, ownerReplyRatePct: 40, ownerRepliesCount: 8 }),
        t,
      ).status,
    ).toBe("active");
    expect(
      classifyBrandReply(
        base({ repliesMeasurable: true, ownerReplyRatePct: 15, ownerRepliesCount: 3 }),
        t,
      ).status,
    ).toBe("occasional");
    expect(
      classifyBrandReply(
        base({ repliesMeasurable: true, ownerReplyRatePct: 0, ownerRepliesCount: 0 }),
        t,
      ).status,
    ).toBe("absent");
  });

  it("com replies não mensuráveis nunca classifica a marca", () => {
    const { status, config } = classifyBrandReply(
      base({ repliesMeasurable: false }),
      t,
    );
    expect(status).toBe("not_measurable");
    expect(status).not.toBe("absent");
    expect(status).not.toBe("minimal");
    expect(config.tone).toBe("slate");
  });

  it("repliesAreMeasurable trata `undefined` como mensurável (retrocompatível)", () => {
    expect(repliesAreMeasurable(base())).toBe(true);
    expect(repliesAreMeasurable(base({ repliesMeasurable: false }))).toBe(false);
  });
});

describe("Conversas — apresentação fiel aos dados", () => {
  it("não hardcoda denominadores de amostra", () => {
    expect(src).not.toContain("/ 12");
    expect(src).not.toMatch(/samplePosts\}\s*\/\s*\d/);
    expect(src).not.toMatch(/`\$\{data\.samplePosts\}\s*\//);
  });

  it("oculta métricas dependentes de replies quando não são mensuráveis", () => {
    expect(src).toContain("if (measurable) {");
    expect(src).toContain("const showTopPost = measurable && Boolean(data.topConversationPost)");
    expect(src).toContain("RepliesNotMeasurableNote");
  });

  it("mostra nota discreta de amostra limitada", () => {
    expect(src).toContain("data.lowConfidence ? <LowConfidenceNote /> : null");
    expect(pt.comments.low_confidence.title).toBeTruthy();
    expect(pt.comments.low_confidence.body).toMatch(/cautela/i);
  });

  it("segue a hierarquia veredicto → voz → sinais → acção → métricas → metodologia", () => {
    const order = [
      "1 · Verdict",
      "2 · Voz da audiência",
      "3 · Sinais observados",
      "4 · Próxima acção",
      "5 · Métricas de suporte",
      "6 · Amostra e metodologia",
    ].map((marker) => src.indexOf(marker));
    expect(order.every((i) => i > -1)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
});

describe("Estado indisponível público — sem tratamento comercial", () => {
  it("não usa dourado, Pro nem preço", () => {
    const publicBranch = src.slice(
      src.indexOf("if (isPublic) {"),
      src.indexOf("// ── internal_lab"),
    );
    expect(publicBranch).not.toContain("accent-gold");
    expect(publicBranch).not.toContain("Sparkles");
    expect(publicBranch).not.toMatch(/pro_title|pro_body/);
    expect(publicBranch).not.toContain("9 €");
  });

  it("cobre processing, sem dados e falha temporária", () => {
    expect(Object.keys(pt.comments.unavailable.public).sort()).toEqual([
      "failed",
      "no_data",
      "processing",
    ]);
    expect(pt.comments.unavailable.pro_title).toBeUndefined();
  });
});

describe("B e C partilham o mesmo card", () => {
  it("o shell usa o mesmo componente nos dois estados", () => {
    const shell = readFileSync(
      resolve(root, "src/components/report-redesign/v2/report-shell-v2.tsx"),
      "utf8",
    );
    expect(shell).toMatch(/\{\(leadCaptured \|\| premiumUnlocked\) && \(/);
    expect(shell.match(/<CommentIntelligenceSection/g)).toHaveLength(1);
  });

  it("a secção não recebe qualquer prop de acesso comercial", () => {
    expect(src).not.toMatch(/access|premiumUnlocked|leadCaptured/);
  });
});
