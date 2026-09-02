import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { AdapterResult } from "@/lib/report/snapshot-to-report-data";
import { resolveReportTier } from "@/lib/report/tiers";

import { buildEditorialEngagementData } from "../engagement/engagement-data";
import { EditorialEngagement } from "../engagement/editorial-engagement";

function makeResult(over: {
  rate: number;
  benchmark: number;
  delta: number;
  followers?: number;
  posts?: number;
  version?: string | null;
}): AdapterResult {
  return {
    data: {
      meta: {
        windowLabel: "últimos 30 dias",
        benchmarkDatasetVersion: over.version ?? "v-test-1",
      },
      profile: {
        username: "perfil",
        followers: over.followers ?? 12_345,
        // Escalão resolvido pelo helper de produção — nunca duplicado aqui.
        ...resolveReportTier(over.followers ?? 12_345),
      },
      keyMetrics: {
        engagementRate: over.rate,
        engagementBenchmark: over.benchmark,
        engagementDeltaPct: over.delta,
        postsAnalyzed: over.posts ?? 17,
        dominantFormat: "Reels",
      },
    },
    coverage: {},
    enriched: {},
    externalReferences: null,
  } as unknown as AdapterResult;
}

describe("buildEditorialEngagementData", () => {
  it("reads production values without recomputing them", () => {
    const d = buildEditorialEngagementData(
      makeResult({ rate: 1.23, benchmark: 2.4, delta: -48.8 }),
    );
    expect(d.rate).toBe(1.23);
    expect(d.benchmark).toBe(2.4);
    expect(d.deltaPct).toBe(-48.8);
    expect(d.postsAnalyzed).toBe(17);
    expect(d.perThousand).toBe(12.3);
  });

  it("identifies the current tier from the real data", () => {
    expect(
      buildEditorialEngagementData(
        makeResult({ rate: 1, benchmark: 2, delta: -50, followers: 900 }),
      ).tierLabel,
    ).toBe("Nano");
    expect(
      buildEditorialEngagementData(
        makeResult({ rate: 1, benchmark: 2, delta: -50, followers: 80_000 }),
      ).tierLabel,
    ).toBe("Mid");
  });

  it("derives status from the production delta (±10%)", () => {
    expect(
      buildEditorialEngagementData(makeResult({ rate: 3, benchmark: 2, delta: 50 }))
        .status.tone,
    ).toBe("success");
    expect(
      buildEditorialEngagementData(makeResult({ rate: 2, benchmark: 2, delta: 0 }))
        .status.tone,
    ).toBe("neutral");
    expect(
      buildEditorialEngagementData(makeResult({ rate: 1, benchmark: 2, delta: -50 }))
        .status.tone,
    ).toBe("warning");
  });

  it("falls back to no tier bands when no benchmark is available", () => {
    const d = buildEditorialEngagementData(
      makeResult({ rate: 1.1, benchmark: 0, delta: 0 }),
    );
    expect(d.hasBenchmark).toBe(false);
    expect(d.tierBands).toHaveLength(0);
  });

  it("exposes a single tier band while the five-tier dataset is server-only", () => {
    const d = buildEditorialEngagementData(
      makeResult({ rate: 1.1, benchmark: 2.4, delta: -54 }),
    );
    expect(d.tierBands).toHaveLength(1);
    expect(d.tierBands[0]!.isCurrent).toBe(true);
    expect(d.tierBands[0]!.value).toBe(2.4);
  });
});

describe("EditorialEngagement rendering", () => {
  it("renders rate and benchmark from the fixture, not hardcoded values", () => {
    const html = renderToStaticMarkup(
      createElement(EditorialEngagement, {
        result: makeResult({ rate: 1.11, benchmark: 2.22, delta: -50 }),
      }),
    );
    expect(html).toContain("1,11%");
    expect(html).toContain("2,22%");
    expect(html).toContain("Estás aqui");
    // Valores do mockup estático nunca podem aparecer.
    expect(html).not.toContain("0,08%");
    expect(html).not.toContain("4,80%");
  });

  it("changes output when the fixture changes", () => {
    const a = renderToStaticMarkup(
      createElement(EditorialEngagement, {
        result: makeResult({ rate: 1.11, benchmark: 2.22, delta: -50 }),
      }),
    );
    const b = renderToStaticMarkup(
      createElement(EditorialEngagement, {
        result: makeResult({ rate: 3.4, benchmark: 2.22, delta: 53 }),
      }),
    );
    expect(a).not.toBe(b);
    expect(b).toContain("3,40%");
  });

  it("renders the fallback state without benchmark bands", () => {
    const html = renderToStaticMarkup(
      createElement(EditorialEngagement, {
        result: makeResult({ rate: 1.4, benchmark: 0, delta: 0 }),
      }),
    );
    expect(html).toContain("Sem referência publicada");
    expect(html).not.toContain("Estás aqui");
  });

  it("triggers no network request while rendering", () => {
    const fetchSpy = vi.fn();
    const original = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    renderToStaticMarkup(
      createElement(EditorialEngagement, {
        result: makeResult({ rate: 1.11, benchmark: 2.22, delta: -50 }),
      }),
    );
    globalThis.fetch = original;
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
