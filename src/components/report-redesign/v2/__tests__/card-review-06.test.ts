import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { computeGlobalScore } from "../overview/score-utils";

const CARD_PATH = resolve(
  process.cwd(),
  "src/components/report-redesign/v2/overview/editorial-identity-card.tsx",
);
const source = readFileSync(CARD_PATH, "utf8");

describe("Card Review 06 — guardas do Índice do perfil", () => {
  it("computeOverall continua a delegar em computeGlobalScore", () => {
    expect(source).toContain("computeGlobalScore(");
    expect(source).toMatch(/scores\.envolvimento\.value/);
    expect(source).toMatch(/scores\.frequencia\.value/);
  });

  it("pesos do índice inalterados (60% envolvimento / 40% cadência)", () => {
    expect(computeGlobalScore(100, 0)).toBe(60);
    expect(computeGlobalScore(0, 100)).toBe(40);
    expect(computeGlobalScore(60, 0)).toBe(36);
  });

  it("clamp 0–100 preservado no índice agregado", () => {
    expect(source).toContain("Math.max(0, Math.min(100, raw))");
  });

  it("verdictLabelToBand mantém o mapeamento actual", () => {
    expect(source).toMatch(/label === "strong"\)\s*return "solid"/);
    expect(source).toMatch(/label === "promising"\)\s*return "developing"/);
  });

  it("fluxo AI → guard → fallback intacto", () => {
    expect(source).toContain("deriveEditorialVerdict(");
    expect(source).toContain("buildFallbackVerdict");
    expect(source).toContain("lowConfidence");
  });

  it("não introduz gating por estado comercial (A/B/C partilham o card)", () => {
    expect(source).not.toMatch(/\bblur-/);
    expect(source).not.toMatch(/lockBoundary|isPro|tierBadge/);
  });
});
