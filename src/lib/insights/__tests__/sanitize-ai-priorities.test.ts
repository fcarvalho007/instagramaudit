import { describe, it, expect } from "vitest";
import {
  sanitizeAiPriorityBody,
  collectPayloadNumbers,
} from "../sanitize-ai-priorities";

describe("sanitizeAiPriorityBody", () => {
  it("keeps supported numbers verbatim", () => {
    const payload = { reply_rate: 25, complaints: 3 };
    const body = "A marca responde em 25% e há 3 queixas.";
    const r = sanitizeAiPriorityBody(body, payload);
    expect(r.sanitized).toBe(false);
    expect(r.body).toBe(body);
  });

  it("tolerates ±1 rounding for percentages", () => {
    const payload = { reply_rate: 24.6 };
    const r = sanitizeAiPriorityBody("Reply rate é 25%.", payload);
    expect(r.sanitized).toBe(false);
  });

  it("strips unsupported numbers and tidies up", () => {
    const payload = { reply_rate: 6 };
    const r = sanitizeAiPriorityBody(
      "A marca responde em 47% dos comentários, com média de 6 respostas.",
      payload,
    );
    expect(r.sanitized).toBe(true);
    expect(r.body).not.toMatch(/47/);
    expect(r.body).toMatch(/6/);
  });

  it("falls back to original when stripping would gut the sentence", () => {
    const payload = {};
    const body = "47%.";
    const r = sanitizeAiPriorityBody(body, payload);
    expect(r.body).toBe(body); // too short after strip → keep original
  });

  it("leaves bodies without numbers unchanged", () => {
    const payload = {};
    const body = "Responder aos comentários cria conversa visível.";
    const r = sanitizeAiPriorityBody(body, payload);
    expect(r.sanitized).toBe(false);
    expect(r.body).toBe(body);
  });

  it("collectPayloadNumbers walks nested objects and arrays", () => {
    const pool = collectPayloadNumbers({
      a: 10,
      b: { c: [3, 7] },
      d: "tem 42 itens",
    });
    expect(pool.has("10")).toBe(true);
    expect(pool.has("3")).toBe(true);
    expect(pool.has("7")).toBe(true);
    expect(pool.has("42")).toBe(true);
  });
});