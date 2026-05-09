import { describe, expect, it } from "vitest";
import { interpretFeedback } from "../feedback-intent";
import type { BetaFeedbackSummary } from "../kanban-columns";

function fb(overrides: Partial<BetaFeedbackSummary> = {}): BetaFeedbackSummary {
  return {
    id: "f1",
    usefulness_score: 4,
    clarity_text: null,
    missing_text: null,
    purchase_intent: "sim",
    pricing_preference: null,
    contact_consent: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("interpretFeedback", () => {
  it("returns 'sem' for null feedback", () => {
    expect(interpretFeedback(null).intent).toBe("sem");
  });

  it("alto: sim + consent + score>=4", () => {
    const r = interpretFeedback(fb({ usefulness_score: 5 }));
    expect(r.intent).toBe("alto");
    expect(r.accent).toBe("revenue");
  });

  it("alto + pricing one_off_3 → relatório único", () => {
    const r = interpretFeedback(fb({ pricing_preference: "one_off_3" }));
    expect(r.nextAction).toMatch(/relatório único/i);
  });

  it("alto + bundle_5_13 → bundle 5", () => {
    const r = interpretFeedback(fb({ pricing_preference: "bundle_5_13" }));
    expect(r.nextAction).toMatch(/bundle 5/i);
  });

  it("alto + plano_mensal → plano mensal", () => {
    const r = interpretFeedback(fb({ pricing_preference: "plano_mensal" }));
    expect(r.nextAction).toMatch(/plano mensal/i);
  });

  it("medio: sim sem consentimento", () => {
    const r = interpretFeedback(fb({ contact_consent: false }));
    expect(r.intent).toBe("medio");
  });

  it("medio: talvez + score>=4 + consent", () => {
    const r = interpretFeedback(fb({ purchase_intent: "talvez" }));
    expect(r.intent).toBe("medio");
  });

  it("baixo: talvez sem consentimento", () => {
    const r = interpretFeedback(
      fb({ purchase_intent: "talvez", contact_consent: false }),
    );
    expect(r.intent).toBe("baixo");
  });

  it("baixo: score = 3", () => {
    const r = interpretFeedback(fb({ usefulness_score: 3, purchase_intent: "talvez" }));
    expect(r.intent).toBe("baixo");
  });

  it("sem: purchase_intent nao", () => {
    const r = interpretFeedback(fb({ purchase_intent: "nao" }));
    expect(r.intent).toBe("sem");
    expect(r.nextAction).toMatch(/arquivar/i);
  });

  it("sem: score <= 2", () => {
    const r = interpretFeedback(fb({ usefulness_score: 2 }));
    expect(r.intent).toBe("sem");
  });
});