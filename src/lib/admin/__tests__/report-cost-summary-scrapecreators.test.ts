import { describe, expect, it } from "vitest";
import {
  summarizeCallLogs,
  detectProviderPresence,
  type ProviderCallRow,
} from "../report-cost-summary.server";
import { providerLabel } from "../cost-source-labels";

function row(partial: Partial<ProviderCallRow>): ProviderCallRow {
  return {
    id: "1",
    provider: "scrapecreators",
    actor: "/v1/instagram/profile",
    handle: "acme",
    status: "success",
    http_status: 200,
    actual_cost_usd: null,
    estimated_cost_usd: 0.002,
    duration_ms: 900,
    created_at: "2026-08-30T14:00:00.000Z",
    ...partial,
  };
}

describe("resumo de custo por relatório com ScrapeCreators", () => {
  it("classifica linhas ScrapeCreators no seu próprio bucket", () => {
    const summary = summarizeCallLogs([row({})], {
      apify: false,
      scrapecreators: true,
      dataforseo: false,
      openai: false,
    });
    expect(summary.scrapecreators.calls).toBe(1);
    expect(summary.apify.calls).toBe(0);
    expect(summary.total_estimated_usd).toBeCloseTo(0.002, 6);
  });

  it("sem linhas, providers ausentes ficam como não usados", () => {
    const summary = summarizeCallLogs(
      [],
      detectProviderPresence({}),
    );
    expect(summary.scrapecreators.source).toBe("not_used");
    expect(summary.apify.source).toBe("not_used");
    expect(summary.confidence).toBe("sem_custos");
  });

  it("tem etiqueta legível", () => {
    expect(providerLabel("scrapecreators")).toBe("ScrapeCreators");
  });
});
