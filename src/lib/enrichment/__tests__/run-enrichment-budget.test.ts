import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  assertSpy,
  generateInsightsSpy,
  generateInsightsV2Spy,
  generateVisualCoverSpy,
  generateCaptionSemanticSpy,
  lovableAllowedSpy,
  lovableAssertSpy,
  generateComparisonReadingsSpy,
} = vi.hoisted(() => ({
  assertSpy: vi.fn(),
  generateInsightsSpy: vi.fn(),
  generateInsightsV2Spy: vi.fn(),
  generateVisualCoverSpy: vi.fn(),
  generateCaptionSemanticSpy: vi.fn(),
  lovableAllowedSpy: vi.fn(() => true),
  lovableAssertSpy: vi.fn(),
  generateComparisonReadingsSpy: vi.fn(),
}));

// Mocks must be declared before importing the SUT.
vi.mock("@/lib/security/openai-allowlist", () => ({
  isOpenAiAllowed: () => true,
}));

vi.mock("@/lib/security/openai-budget.server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/security/openai-budget.server")>(
    "@/lib/security/openai-budget.server",
  );
  return {
    ...actual,
    assertOpenAiDailyBudgetAvailable: assertSpy,
  };
});

vi.mock("@/lib/insights/openai-insights.server", () => ({
  generateInsights: generateInsightsSpy,
  generateInsightsV2: generateInsightsV2Spy,
}));

vi.mock("@/lib/report/visual-cover-analysis.server", () => ({
  generateVisualCoverAnalysis: generateVisualCoverSpy,
}));

vi.mock("@/lib/report/caption-semantic-analysis.server", () => ({
  generateCaptionSemanticAnalysis: generateCaptionSemanticSpy,
}));

vi.mock("@/lib/security/lovable-ai-allowlist", () => ({
  isLovableAiAllowed: (...args: unknown[]) => lovableAllowedSpy(...args),
}));

vi.mock("@/lib/security/lovable-ai-budget.server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/security/lovable-ai-budget.server")>(
    "@/lib/security/lovable-ai-budget.server",
  );
  return {
    ...actual,
    assertLovableAiDailyBudgetAvailable: lovableAssertSpy,
  };
});

vi.mock("@/lib/comparison-readings/generate.server", () => ({
  generateComparisonReadingsForSnapshot: generateComparisonReadingsSpy,
}));

// Avoid touching DB / DataForSEO from unrelated branches.
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: () => ({ select: () => ({ eq: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }) }) }) },
}));
vi.mock("@/lib/security/dataforseo-allowlist", () => ({
  isDataForSeoEnabled: () => false,
  isAllowed: () => false,
}));

import { OpenAiBudgetExceededError } from "@/lib/security/openai-budget.server";
import { LovableAiBudgetExceededError } from "@/lib/security/lovable-ai-budget.server";
import { runEnrichment } from "@/lib/enrichment/run-enrichment.server";
import type { SnapshotRow } from "@/lib/analysis/cache";

function makeSnapshot(): SnapshotRow {
  return {
    id: "snap-1",
    instagram_username: "nasa",
    cache_key: "k",
    provider: "apify",
    analysis_status: "ready",
    competitor_usernames: [],
    normalized_payload: {
      profile: { username: "nasa", followers: 1000 },
      content_summary: {},
      posts: [],
      format_stats: {},
      competitors: [],
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3_600_000).toISOString(),
  } as unknown as SnapshotRow;
}

beforeEach(() => {
  assertSpy.mockReset();
  generateInsightsSpy.mockReset();
  generateInsightsV2Spy.mockReset();
  generateVisualCoverSpy.mockReset();
  generateCaptionSemanticSpy.mockReset();
  lovableAllowedSpy.mockReset();
  lovableAllowedSpy.mockReturnValue(true);
  lovableAssertSpy.mockReset();
  generateComparisonReadingsSpy.mockReset();
});

describe("run-enrichment OpenAI budget gate", () => {
  it("insights_v1: budget excedido devolve {ok:true, patch:null} sem chamar OpenAI", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    assertSpy.mockRejectedValueOnce(new OpenAiBudgetExceededError(10, 5));

    const res = await runEnrichment("insights_v1", makeSnapshot(), null);

    expect(res).toEqual({ ok: true, payloadPatch: null });
    expect(generateInsightsSpy).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("insights_v2: budget excedido devolve {ok:true, patch:null} sem chamar OpenAI", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    assertSpy.mockRejectedValueOnce(new OpenAiBudgetExceededError(10, 5));

    const res = await runEnrichment("insights_v2", makeSnapshot(), null);

    expect(res).toEqual({ ok: true, payloadPatch: null });
    expect(generateInsightsV2Spy).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("visual_cover: budget excedido faz skip silencioso", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    assertSpy.mockRejectedValueOnce(new OpenAiBudgetExceededError(10, 5));

    const res = await runEnrichment("visual_cover", makeSnapshot(), null);

    expect(res.ok).toBe(true);
    expect(res.payloadPatch).toBeNull();
    expect(generateVisualCoverSpy).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("caption_semantic: budget excedido faz skip silencioso", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    assertSpy.mockRejectedValueOnce(new OpenAiBudgetExceededError(10, 5));

    const res = await runEnrichment("caption_semantic", makeSnapshot(), null);

    expect(res.ok).toBe(true);
    expect(res.payloadPatch).toBeNull();
    expect(generateCaptionSemanticSpy).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("run-enrichment Lovable AI gate (comparison_readings)", () => {
  it("kill-switch off / not allowed → skipReason sem chamar gateway", async () => {
    lovableAllowedSpy.mockReturnValue(false);
    const res = await runEnrichment("comparison_readings", makeSnapshot(), null);
    expect(res.ok).toBe(true);
    expect(res.payloadPatch).toBeNull();
    expect(res.skipReason).toBe("LOVABLE_AI_DISABLED_OR_NOT_ALLOWED");
    expect(generateComparisonReadingsSpy).not.toHaveBeenCalled();
  });

  it("budget excedido → skipReason sem chamar gateway", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    lovableAssertSpy.mockRejectedValueOnce(new LovableAiBudgetExceededError(10, 5));
    const res = await runEnrichment("comparison_readings", makeSnapshot(), null);
    expect(res.ok).toBe(true);
    expect(res.payloadPatch).toBeNull();
    expect(res.skipReason).toBe("LOVABLE_AI_BUDGET_EXCEEDED");
    expect(generateComparisonReadingsSpy).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("gates ok mas sem competidores → skip silencioso (sem skipReason)", async () => {
    lovableAssertSpy.mockResolvedValueOnce(undefined);
    const res = await runEnrichment("comparison_readings", makeSnapshot(), null);
    expect(res).toEqual({ ok: true, payloadPatch: null });
    expect(generateComparisonReadingsSpy).not.toHaveBeenCalled();
  });
});