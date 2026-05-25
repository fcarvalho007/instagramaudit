import { describe, it, expect } from "vitest";
import {
  getCadenceHeaderPt,
  getCadenceSummaryPt,
  getCadenceFormulaNotePt,
} from "../report-overview-cards";

describe("cadence copy helpers (PostingRhythmCard)", () => {
  it("window_30d → 'últimos 30 dias' header + summary + ÷ 4,345 note", () => {
    expect(getCadenceHeaderPt("window_30d")).toBe(
      "Ritmo observado nos últimos 30 dias",
    );
    expect(getCadenceSummaryPt("window_30d", 10, 30)).toBe(
      "10 publicações nos últimos 30 dias",
    );
    expect(getCadenceFormulaNotePt("window_30d")).toContain("4,345");
  });

  it("window_90d → 'últimos 90 dias' header + ÷ 12,857 note", () => {
    expect(getCadenceHeaderPt("window_90d")).toBe(
      "Ritmo observado nos últimos 90 dias",
    );
    expect(getCadenceSummaryPt("window_90d", 4, 90)).toBe(
      "4 publicações nos últimos 90 dias",
    );
    expect(getCadenceFormulaNotePt("window_90d")).toContain("12,857");
  });

  it("sample_span → 'amostra reduzida' summary + sample formula note", () => {
    expect(getCadenceHeaderPt("sample_span")).toBe(
      "Ritmo observado na amostra recente",
    );
    expect(getCadenceSummaryPt("sample_span", 2, 40)).toBe(
      "2 publicações em 40 dias (amostra reduzida)",
    );
    expect(getCadenceFormulaNotePt("sample_span")).toContain("amostra");
  });

  it("insufficient → neutral header, no summary, no formula note", () => {
    expect(getCadenceHeaderPt("insufficient")).toBe("Ritmo de publicação");
    expect(getCadenceSummaryPt("insufficient", 0, 0)).toBeNull();
    expect(getCadenceFormulaNotePt("insufficient")).toBeNull();
  });

  it("never claims a long-term cadence in the insufficient state", () => {
    // Regression guard: the previous bug would have surfaced
    // "Menos de 1 post por semana" / a hardcoded weekly value here.
    const header = getCadenceHeaderPt("insufficient");
    expect(header).not.toMatch(/semana|week|dia|day/i);
  });
});