import { describe, expect, it } from "vitest";

import {
  PRICING_FEEDBACK_TRIGGERS,
  pricingFeedbackSchema,
} from "@/lib/pricing-feedback";
import { PRICING_PREFERENCES } from "@/lib/unlock-flow";

const VALID_LEAD_ID = "11111111-1111-4111-8111-111111111111";
const VALID_SNAPSHOT_ID = "22222222-2222-4222-8222-222222222222";

function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    lead_id: VALID_LEAD_ID,
    snapshot_id: VALID_SNAPSHOT_ID,
    pricing_preference: "under_3" as const,
    trigger: "scroll" as const,
    ...overrides,
  };
}

describe("pricingFeedbackSchema", () => {
  it("accepts every pricing_preference option", () => {
    for (const opt of PRICING_PREFERENCES) {
      const result = pricingFeedbackSchema.safeParse(
        basePayload({ pricing_preference: opt }),
      );
      expect(result.success, `option ${opt}`).toBe(true);
    }
  });

  it("accepts every trigger value", () => {
    for (const trig of PRICING_FEEDBACK_TRIGGERS) {
      const result = pricingFeedbackSchema.safeParse(
        basePayload({ trigger: trig }),
      );
      expect(result.success, `trigger ${trig}`).toBe(true);
    }
  });

  it("rejects non-uuid lead_id", () => {
    const result = pricingFeedbackSchema.safeParse(
      basePayload({ lead_id: "not-a-uuid" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid snapshot_id", () => {
    const result = pricingFeedbackSchema.safeParse(
      basePayload({ snapshot_id: "x" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects pricing_preference outside the enum", () => {
    const result = pricingFeedbackSchema.safeParse(
      basePayload({ pricing_preference: "under_5" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects trigger outside the enum", () => {
    const result = pricingFeedbackSchema.safeParse(
      basePayload({ trigger: "click" }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects extra fields (strict mode)", () => {
    const result = pricingFeedbackSchema.safeParse(
      basePayload({ extra: "nope" }),
    );
    expect(result.success).toBe(false);
  });
});