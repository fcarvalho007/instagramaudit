import { describe, expect, it } from "vitest";
import { renderReportSaved } from "../templates/report-saved";

const baseArgs = {
  firstName: "Frederico",
  instagramHandle: "webhspt",
  reportUrl: "https://example.com/reports/abc",
  analyzeAnotherUrl: "https://example.com/",
};

function assertNoBrokenPlaceholders(html: string, text: string) {
  for (const blob of [html, text]) {
    expect(blob).not.toMatch(/\{\{/);
    expect(blob).not.toMatch(/\bundefined\b/);
    expect(blob).not.toMatch(/>\s*null\s*</);
  }
}

describe("renderReportSaved", () => {
  it("renders full data with credit card, 3 insights and both CTAs", () => {
    const r = renderReportSaved({
      ...baseArgs,
      variant: "welcome",
      credits: { totalFree: 2, used: 1, remaining: 1 },
      insights: {
        followersLabel: "10,2 mil",
        dominantFormat: "carrosséis",
        engagementRate: "4,2%",
        benchmarkDelta: "+1,1 pp acima da média",
        topPostFormat: "carrossel",
        topPostEngagement: "0,15%",
      },
    });
    expect(r.subject).toContain("@webhspt");
    expect(r.html).toContain("As tuas análises grátis");
    expect(r.html).toContain("10,2 mil");
    expect(r.html).toContain("carrosséis");
    expect(r.html).toContain("Analisar outro perfil");
    expect(r.html).toContain("Abrir relatório de");
    expect(r.html).toContain("Bem-vindo à beta");
    expect(r.text).toContain("1. ");
    expect(r.text).toContain("2. ");
    expect(r.text).toContain("3. ");
    assertNoBrokenPlaceholders(r.html, r.text);
  });

  it("renders without credit data: card hidden, CTAs still present", () => {
    const r = renderReportSaved({
      ...baseArgs,
      variant: "returning",
      credits: null,
      insights: {
        followersLabel: "10,2 mil",
        dominantFormat: "carrosséis",
      },
    });
    expect(r.html).not.toContain("As tuas análises grátis");
    expect(r.html).not.toContain("Bem-vindo à beta");
    expect(r.html).toContain("Analisar outro perfil");
    expect(r.html).toContain("1. ");
    assertNoBrokenPlaceholders(r.html, r.text);
  });

  it("renders with partial insights (only #1)", () => {
    const r = renderReportSaved({
      ...baseArgs,
      credits: { totalFree: 2, used: 1, remaining: 1 },
      insights: {
        followersLabel: "10,2 mil",
        dominantFormat: "carrosséis",
      },
    });
    expect(r.text).toContain("1. ");
    expect(r.text).not.toContain("2. ");
    expect(r.text).not.toContain("3. ");
    assertNoBrokenPlaceholders(r.html, r.text);
  });

  it("renders neutral fallback when no insights are available", () => {
    const r = renderReportSaved({
      ...baseArgs,
      credits: null,
      insights: null,
    });
    expect(r.html).toContain("O teu relatório está guardado");
    expect(r.html).toContain("Analisar outro perfil");
    expect(r.html).toContain("Abrir relatório de");
    expect(r.html).not.toMatch(/<ol[^>]*>/);
    assertNoBrokenPlaceholders(r.html, r.text);
  });

  it("never renders broken placeholders even with empty firstName", () => {
    const r = renderReportSaved({
      ...baseArgs,
      firstName: null,
      credits: { totalFree: 2, used: 1, remaining: 1 },
      insights: { followersLabel: "1 mil", dominantFormat: "reels" },
    });
    assertNoBrokenPlaceholders(r.html, r.text);
  });
});