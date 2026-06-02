import { describe, expect, it } from "vitest";

import { buildStartPayload } from "@/lib/leads/build-start-payload";
import type { UnlockFormValues } from "@/lib/unlock-flow";

const baseValues: UnlockFormValues = {
  full_name: "Ana Marques",
  email: "ana@example.com",
  phone: "",
  profile_ownership: "own_profile",
  goal: "improve_content",
  user_type: "creator",
  goal_other_text: "",
  user_type_other_text: "",
  gdpr_consent: true as unknown as true,
  marketing_consent: false,
};

describe("buildStartPayload", () => {
  it("never includes user_type", () => {
    const payload = buildStartPayload(baseValues, "Ana Marques", "", 1_700_000_000_000);
    expect("user_type" in payload).toBe(false);
  });

  it("includes _t equal to formStartedAt", () => {
    const ts = 1_725_000_000_000;
    const payload = buildStartPayload(baseValues, "Ana Marques", "", ts);
    expect(payload._t).toBe(ts);
  });

  it("always includes the website honeypot field (drained server-side)", () => {
    const empty = buildStartPayload(baseValues, "Ana Marques", "", 1);
    const filled = buildStartPayload(baseValues, "Ana Marques", "spam-bot", 1);
    expect(empty.website).toBe("");
    expect(filled.website).toBe("spam-bot");
  });

  it("omits phone when blank, trims when present", () => {
    const empty = buildStartPayload({ ...baseValues, phone: "   " }, "Ana", "", 1);
    expect(empty.phone).toBeUndefined();

    const filled = buildStartPayload(
      { ...baseValues, phone: "  +351 912 345 678  " },
      "Ana",
      "",
      1,
    );
    expect(filled.phone).toBe("+351 912 345 678");
  });

  it("propagates marketing_consent as boolean", () => {
    const off = buildStartPayload(baseValues, "Ana", "", 1);
    expect(off.marketing_consent).toBe(false);
    const on = buildStartPayload({ ...baseValues, marketing_consent: true }, "Ana", "", 1);
    expect(on.marketing_consent).toBe(true);
  });

  it("forces beta_consent false (schema legacy)", () => {
    const payload = buildStartPayload(baseValues, "Ana", "", 1);
    expect(payload.beta_consent).toBe(false);
  });

  it("uses parsedFullName when present, falls back to full_name", () => {
    const a = buildStartPayload(baseValues, "Ana Marques", "", 1);
    expect(a.name).toBe("Ana Marques");
    const b = buildStartPayload(baseValues, "", "", 1);
    expect(b.name).toBe("Ana Marques");
  });

  it("always sends gdpr_consent === true", () => {
    const payload = buildStartPayload(baseValues, "Ana", "", 1);
    expect(payload.gdpr_consent).toBe(true);
  });
});