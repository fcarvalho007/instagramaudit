import { describe, expect, it } from "vitest";
import { feedbackFormSchema } from "../feedback-schema";

describe("feedbackFormSchema", () => {
  it("accepts a minimal valid payload", () => {
    const parsed = feedbackFormSchema.parse({
      usefulness_score: 4,
      purchase_intent: "talvez",
      contact_consent: false,
    });
    expect(parsed.usefulness_score).toBe(4);
    expect(parsed.purchase_intent).toBe("talvez");
    expect(parsed.clarity_text).toBeUndefined();
    expect(parsed.pricing_preference).toBeUndefined();
  });

  it("rejects out-of-range usefulness_score", () => {
    const r = feedbackFormSchema.safeParse({
      usefulness_score: 6,
      purchase_intent: "sim",
      contact_consent: false,
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown purchase_intent", () => {
    const r = feedbackFormSchema.safeParse({
      usefulness_score: 3,
      purchase_intent: "maybe",
      contact_consent: false,
    });
    expect(r.success).toBe(false);
  });

  it("trims and normalises empty strings to undefined", () => {
    const parsed = feedbackFormSchema.parse({
      usefulness_score: 5,
      clarity_text: "   ",
      missing_text: "Faltou benchmark de stories.",
      purchase_intent: "sim",
      contact_consent: true,
    });
    expect(parsed.clarity_text).toBeUndefined();
    expect(parsed.missing_text).toBe("Faltou benchmark de stories.");
    expect(parsed.contact_consent).toBe(true);
  });

  it("enforces max length on free text", () => {
    const r = feedbackFormSchema.safeParse({
      usefulness_score: 3,
      missing_text: "x".repeat(501),
      purchase_intent: "talvez",
      contact_consent: false,
    });
    expect(r.success).toBe(false);
  });

  it("accepts every pricing_preference option", () => {
    for (const opt of [
      "single_report_7",
      "pack_5_reports_28",
      "not_ready_to_pay",
      "other",
    ] as const) {
      const r = feedbackFormSchema.safeParse({
        usefulness_score: 4,
        purchase_intent: "sim",
        pricing_preference: opt,
        contact_consent: false,
      });
      expect(r.success).toBe(true);
    }
  });
});