import { describe, it, expect } from "vitest";
import {
  sanitizeAiPriorityBody } from "../sanitize-ai-priorities";

describe("field-bound priority claims", () => {
  it("rejects unsupported numbers even when removing them leaves a short body", () => {
    expect(sanitizeAiPriorityBody("Resposta: 87%", {})).toEqual({ body: "", sanitized: true });
  });

  it("rejects a real number attached to the wrong metric", () => {
    expect(
      sanitizeAiPriorityBody("A taxa de resposta da marca é 12%.", {
        sample_posts: 12,
        owner_reply_rate_pct: 0,
      }).body,
    ).toBe("");
  });

  it("renders only exact field/value matches", () => {
    expect(
      sanitizeAiPriorityBody(
        "Resposta observada: {{content_summary.average_engagement_rate}}",
        { content_summary: { average_engagement_rate: 0 } },
        [{ field: "content_summary.average_engagement_rate", value: 0, unit: "%" }],
      ).body,
    ).toBe("Resposta observada: 0%");
    expect(
      sanitizeAiPriorityBody(
        "Resposta: {{content_summary.average_engagement_rate}}",
        { content_summary: { average_engagement_rate: 10 } },
        [{ field: "content_summary.average_engagement_rate", value: 12, unit: "%" }],
      ).body,
    ).toBe("");
  });

  it("keeps non-numeric hypotheses", () => {
    expect(
      sanitizeAiPriorityBody("Testar perguntas relacionadas com o tema da publicação.", {}).body,
    ).toContain("Testar");
  });
});
