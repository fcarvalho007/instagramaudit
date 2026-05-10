import { describe, it, expect } from "vitest";
import { renderReportSummary } from "../templates/report-summary";

const REPORT_URL = "https://instagramaudit.lovable.app/analyze/frederico.m.carvalho";

const baseInput = {
  firstName: "Maria",
  instagramHandle: "frederico.m.carvalho",
  reportUrl: REPORT_URL,
  kpis: {
    followers: 12480,
    engagementPct: 3.42,
    dominantFormat: "Carrosséis",
    benchmarkDeltaPp: 1.2,
  },
  topPost: {
    format: "Reel",
    engagementPct: 7.85,
    thumbnailUrl: null,
    permalink: null,
  },
};

describe("renderReportSummary", () => {
  it("uses spec-literal subject and preheader", () => {
    const out = renderReportSummary(baseInput);
    expect(out.subject).toBe("Resumo da análise de @frederico.m.carvalho");
    expect(out.html).toContain("Os principais sinais do teu relatório InstaBench.");
  });

  it("renders all 4 KPI values exactly from input", () => {
    const out = renderReportSummary(baseInput);
    expect(out.html).toContain("12\u00a0480"); // pt-PT thousands sep (NBSP)
    expect(out.html).toContain("3,42\u00a0%");
    expect(out.html).toContain("Carrosséis");
    expect(out.html).toContain("+1,2 pp");
  });

  it("escapes HTML in handle to prevent injection", () => {
    const out = renderReportSummary({
      ...baseInput,
      instagramHandle: "a<b>c",
    });
    expect(out.html).not.toContain("<b>c");
    expect(out.html).toContain("a&lt;b&gt;c");
  });

  it("omits anchor when permalink is missing and uses gradient fallback when no thumbnail", () => {
    const out = renderReportSummary(baseInput);
    expect(out.html).not.toMatch(/<a href="https?:\/\/[^"]*"[^>]*>\s*<table/);
    expect(out.html).toContain("linear-gradient(135deg,#3772E5,#7664E4)");
  });

  it("renders permalink anchor when provided", () => {
    const out = renderReportSummary({
      ...baseInput,
      topPost: { ...baseInput.topPost, permalink: "https://instagram.com/p/abc" },
    });
    expect(out.html).toContain('href="https://instagram.com/p/abc"');
  });

  it("includes the CTA URL", () => {
    const out = renderReportSummary(baseInput);
    expect(out.html).toContain(REPORT_URL);
    expect(out.html).toContain("Ver relatório completo");
  });

  it("throws when reportUrl is missing", () => {
    expect(() =>
      renderReportSummary({ ...baseInput, reportUrl: "" }),
    ).toThrow();
  });
});