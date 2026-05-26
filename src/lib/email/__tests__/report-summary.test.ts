import { describe, it, expect } from "vitest";
import { renderReportSummary } from "../templates/report-summary";

const REPORT_URL = "https://auditprofiles.com/analyze/frederico.m.carvalho";

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
    expect(out.html).toContain("As 3 conclusões principais em 60 segundos.");
  });

  it("renders 3 numbered conclusions in plain text", () => {
    const out = renderReportSummary(baseInput);
    expect(out.text).toMatch(/1\. /);
    expect(out.text).toMatch(/2\. /);
    expect(out.text).toMatch(/3\. /);
  });

  it("includes handle, followers, dominant format, delta and top-post format", () => {
    const out = renderReportSummary(baseInput);
    expect(out.text).toContain("@frederico.m.carvalho");
    // pt-PT thousand separator may be NBSP or regular space depending on Intl runtime
    expect(out.text).toMatch(/12.480/);
    expect(out.text).toContain("Carrosséis");
    expect(out.text).toContain("+1,2 pp");
    expect(out.text).toContain("Reel");
    expect(out.text).toMatch(/7,85.{1,6}%/);
  });

  it("escapes HTML in handle to prevent injection", () => {
    const out = renderReportSummary({
      ...baseInput,
      instagramHandle: "a<b>c",
    });
    expect(out.html).not.toContain("<b>c</b>");
    expect(out.html).toContain("a&lt;b&gt;c");
  });

  it("includes the CTA button and URL", () => {
    const out = renderReportSummary(baseInput);
    expect(out.html).toContain(REPORT_URL);
    expect(out.html).toContain("Ver relatório completo");
  });

  it("throws when reportUrl is missing", () => {
    expect(() =>
      renderReportSummary({ ...baseInput, reportUrl: "" }),
    ).toThrow();
  });

  it("throws when instagramHandle is missing", () => {
    expect(() =>
      renderReportSummary({ ...baseInput, instagramHandle: "" }),
    ).toThrow();
  });
});
