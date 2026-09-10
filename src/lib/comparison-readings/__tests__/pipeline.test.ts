import { snapshotToReportData, type SnapshotPayload } from "@/lib/report/snapshot-to-report-data";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { canonicalFixture } from "./fixtures";
import { buildComparisonEvidence, type ComparisonEvidencePack } from "../build-evidence";
import { buildCoverage, windowBounds } from "../coverage";
import { generateComparisonReadingsForSnapshot } from "../generate.server";
import { StoredComparisonCollectionSchema } from "../types";
import { comparisonExportSections } from "../export";
import { selectComparisonReadings } from "@/components/report-redesign/v2/leitura-ia/use-comparison-readings";
import { buildReportSnapshotPayload } from "@/lib/report-snapshots/build-report-snapshot-payload.server";
import { readFrozenAnalysis } from "@/lib/report-snapshots/frozen-analysis";
import { enrichPosts } from "@/lib/analysis/normalize";
const mocks = vi.hoisted(() => ({ log: vi.fn(), budget: vi.fn(), invalidate: vi.fn() }));
vi.mock("@/lib/analysis/events", () => ({ recordProviderCall: mocks.log }));
vi.mock("@/lib/security/lovable-ai-budget.server", () => ({
  assertLovableAiDailyBudgetAvailable: mocks.budget,
  invalidateLovableAiBudgetCache: mocks.invalidate,
}));
function fixture() {
  const p = canonicalFixture();
  const bounds = windowBounds("30d", Date.parse(p.analysis_window_end));
  return {
    ...p,
    comparison_version: 2,
    collection_coverage: buildCoverage(p.posts, bounds, 100, false),
    competitors: p.competitors.map((c) => ({
      ...c,
      collection_coverage: buildCoverage(c.posts, bounds, 100, false),
    })),
  };
}
function output(pack: ComparisonEvidencePack) {
  return {
    version: "1",
    language: "pt-PT",
    global_summary: {
      headline: "Diferenças observadas",
      key_reading: "A leitura descreve as amostras recolhidas.",
      confidence: "medium",
    },
    cards: [
      {
        card_id: "engagement",
        headline: "Envolvimento observado",
        key_reading:
          "Perfil: {{primary.engagement_rate_pct}}; conta comparada: {{competitor.engagement_rate_pct}}.",
        confidence: "medium",
        recommendation: null,
        caveats: [],
        evidence_points: [
          {
            label: "Envolvimento",
            field: "engagement_rate_pct",
            primary_value: pack.primary.engagement_rate_pct,
            competitor_value: pack.competitor.engagement_rate_pct,
          },
        ],
        sources: [
          {
            side: "primary",
            post_id: pack.primary.sampled_posts[0].id,
            quote: "Uma publicação concreta",
          },
        ],
        diagnosis: {
          pattern: "Respostas diferentes nos dados observados",
          interpretation: "O tema pode influenciar a resposta; esta é uma hipótese.",
          transferability: "A diferença de públicos limita a transferência.",
        },
        priority_rank: 1,
        experiment: {
          hypothesis: "Testar uma abertura em forma de pergunta pode alterar os comentários.",
          execution: "Reescrever a abertura mantendo tema e formato.",
          effort: "baixo",
          duration_days: 14,
          intended_posts: 4,
          success_metric: "median_comments",
          evaluation:
            "Comparar a mediana com um período anterior equivalente e registar limitações.",
        },
      },
    ],
  };
}
async function gateway(_url: unknown, init?: RequestInit) {
  const body = JSON.parse(String(init?.body));
  const prompt = body.messages[1].content as string;
  const pack = JSON.parse(prompt.slice(prompt.indexOf("\n") + 1)) as ComparisonEvidencePack;
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(output(pack)) } }],
      usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 },
    }),
    { status: 200 },
  );
}
beforeEach(() => {
  vi.stubEnv("LOVABLE_API_KEY", "test-only");
  vi.stubGlobal("fetch", vi.fn(gateway));
  mocks.log.mockReset().mockResolvedValue(undefined);
  mocks.budget.mockReset().mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("persisted comparative pipeline", () => {
  it("generates both accounts, reuses them without more calls, and keeps history/PDF identical", async () => {
    const p = fixture();
    const generated = await generateComparisonReadingsForSnapshot(p, { handle: "alpha" });
    expect(generated.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
    const persisted: Record<string, unknown> = { ...p, ...generated.payloadPatch };
    const collection = StoredComparisonCollectionSchema.parse(persisted.ai_comparison_readings_v2);
    expect(Object.keys(collection.by_competitor)).toEqual(["beta", "gamma"]);
    const view = snapshotToReportData({ payload: persisted as SnapshotPayload });
    expect(view.data.competitorBreakdown[0].windowAligned).toBe(true);
    expect(view.data.competitorBreakdown[0].estimatedPostsPerWeek).toBe(
      buildComparisonEvidence(p)?.competitor.posting_frequency_weekly,
    );
    expect(
      selectComparisonReadings(persisted, "beta", "30d")?.byCard.engagement?.key_reading,
    ).toContain("1,6%");
    expect(
      selectComparisonReadings(persisted, "gamma", "30d")?.byCard.engagement?.key_reading,
    ).toContain("0,8%");
    expect(selectComparisonReadings(persisted, "beta", "90d")).toBeNull();
    expect(selectComparisonReadings(persisted, "other", "30d")).toBeNull();
    await generateComparisonReadingsForSnapshot(persisted, { handle: "alpha" });
    expect(fetch).toHaveBeenCalledTimes(2);
    const historical = buildReportSnapshotPayload({
      normalized_payload: persisted,
      instagram_username: "alpha",
      competitor_usernames: ["beta", "gamma"],
    });
    expect(historical.payload_schema_version).toBe("report.v2");
    const restored = readFrozenAnalysis(historical.payload);
    expect(comparisonExportSections(restored)).toEqual(comparisonExportSections(persisted));
    expect(selectComparisonReadings(restored, "gamma", "30d")).toEqual(
      selectComparisonReadings(persisted, "gamma", "30d"),
    );
    expect(
      mocks.log.mock.calls.every(
        ([call]) => call.durationMs >= 0 && call.estimatedCostUsd > 0 && call.totalTokens === 1500,
      ),
    ).toBe(true);
  });
  it("preserves the successful account on provider failure and retries only the failure", async () => {
    const mock = vi.mocked(fetch);
    mock
      .mockImplementationOnce(gateway)
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    const first = await generateComparisonReadingsForSnapshot(fixture(), { handle: "alpha" });
    expect(first.ok).toBe(false);
    const stored = { ...fixture(), ...first.payloadPatch };
    expect(selectComparisonReadings(stored, "beta", "30d")).not.toBeNull();
    expect(selectComparisonReadings(stored, "gamma", "30d")).toBeNull();
    const second = await generateComparisonReadingsForSnapshot(stored, { handle: "alpha" });
    expect(second.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(3);
  });
  it("coalesces concurrent requests to exactly one generation per account", async () => {
    await Promise.all([
      generateComparisonReadingsForSnapshot(fixture(), { handle: "alpha" }),
      generateComparisonReadingsForSnapshot(fixture(), { handle: "alpha" }),
    ]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("does not call the gateway after a budget rejection", async () => {
    mocks.budget.mockRejectedValue(new Error("daily cap"));
    const result = await generateComparisonReadingsForSnapshot(fixture(), { handle: "alpha" });
    expect(result.ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("preserves all wide-window posts while retaining the baseline cap", () => {
    const raw = Array.from({ length: 90 }, (_, i) => ({
      id: String(i),
      timestamp: new Date(Date.UTC(2026, 6, i + 1)).toISOString(),
      likesCount: i,
      commentsCount: 0,
    }));
    expect(enrichPosts(raw, 1000).posts).toHaveLength(12);
    expect(enrichPosts(raw, 1000, 300).posts).toHaveLength(90);
    const p = { ...fixture(), posts: enrichPosts(raw, 1000, 300).posts };
    const h = buildReportSnapshotPayload({
      normalized_payload: p,
      instagram_username: "alpha",
      competitor_usernames: [],
    });
    expect((readFrozenAnalysis(h.payload).posts as unknown[]).length).toBe(90);
  });
  it.each(Array.from({ length: 20 }, (_, i) => i))(
    "keeps numeric evidence bound under synthetic case %i",
    (i) => {
      const p = fixture();
      p.profile.followers_count = i === 0 ? 0 : (i + 1) * 750;
      p.content_summary.average_engagement_rate = i / 10;
      const pack = buildComparisonEvidence(p)!;
      expect(pack.primary.followers).toBe(p.profile.followers_count);
      expect(pack.primary.engagement_rate_pct).toBe(i === 0 ? null : i / 10);
      expect(
        buildComparisonEvidence({
          ...p,
          competitors: [{ success: false, username: "private" }, p.competitors[1]],
        })?.competitor.handle,
      ).toBe("gamma");
    },
  );
});
