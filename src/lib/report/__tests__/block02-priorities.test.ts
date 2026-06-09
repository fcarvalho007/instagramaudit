import { describe, it, expect } from "vitest";
import {
  derivePriorities,
  type ContentTypeResult,
  type FunnelStageResult,
  type CaptionPatternResult,
  type AudienceResponseResult,
  type IntegrationResult,
} from "../block02-diagnostic";

function baseInputs() {
  const contentType: ContentTypeResult = {
    available: true,
    label: "Educativo",
    sharePct: 40,
    sampleSize: 12,
    distribution: [
      { label: "Educativo", sharePct: 40, count: 5 },
      { label: "Inspiracional", sharePct: 25, count: 3 },
      { label: "Promocional", sharePct: 15, count: 2 },
    ],
  };
  const funnel: FunnelStageResult = {
    available: true,
    label: "Meio do funil",
    sharePct: 50,
    sampleSize: 12,
    breakdown: [],
  };
  const caption: CaptionPatternResult = {
    available: true,
    label: "Médias e explicativas",
    avgLength: 150,
    ctaSharePct: 30,
    questionSharePct: 25,
    questionShareAvailable: true,
    sampleSize: 12,
  };
  const audience: AudienceResponseResult = {
    available: true,
    label: "Resposta moderada",
    status: "moderate",
    commentsToLikesPct: 5,
    avgComments: 8,
    avgLikes: 160,
    sampleSize: 12,
    totals: { likes: 1920, comments: 96, postsWithComments: 11, analysedPosts: 12 },
    topConversationPost: null,
  };
  const integration: IntegrationResult = {
    available: true,
    label: "Integração parcial",
    signals: {
      bioLink: { detected: true, value: "https://example.com" },
      siteOrNewsletter: { detected: true, count: 2 },
      explicitCta: { detected: true, sharePct: 30 },
    },
  };
  return { contentType, funnel, caption, audience, integration };
}

describe("derivePriorities", () => {
  it("always returns at least 3 items even for a 'healthy' profile", () => {
    const items = derivePriorities({
      ...baseInputs(),
      dominantFormatShare: 35,
      dominantFormatLabel: "Carrossel",
    });
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it("returns at most 6 items", () => {
    const inputs = baseInputs();
    inputs.integration.signals.bioLink = { detected: false };
    inputs.integration.signals.explicitCta = { detected: false, sharePct: 5 };
    inputs.audience.label = "Audiência silenciosa";
    inputs.audience.status = "silent";
    inputs.caption.label = "Curtas e diretas";
    inputs.contentType.sharePct = 70;
    const items = derivePriorities({
      ...inputs,
      dominantFormatShare: 70,
      dominantFormatLabel: "Carrossel",
    });
    expect(items.length).toBeLessThanOrEqual(6);
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it("ranks 'alta' levels before 'oportunidade'", () => {
    const inputs = baseInputs();
    inputs.integration.signals.bioLink = { detected: false };
    inputs.audience.label = "Audiência silenciosa";
    inputs.audience.status = "silent";
    const items = derivePriorities({
      ...inputs,
      dominantFormatShare: 35,
      dominantFormatLabel: "Carrossel",
    });
    expect(items.length).toBeGreaterThanOrEqual(3);
    // First item should be a high-priority "alta" rule
    expect(items[0].level).toBe("alta");
  });
});