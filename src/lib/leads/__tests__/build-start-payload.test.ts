import { describe, expect, it } from "vitest";

import { buildStartPayload } from "@/lib/leads/build-start-payload";
import type { UnlockFormValues } from "@/lib/unlock-flow";

const baseValues: UnlockFormValues = {
  full_name: "Ana Marques",
  email: "ana@example.com",
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

  it("never includes phone (field removed from public modal)", () => {
    const empty = buildStartPayload(baseValues, "Ana", "", 1);
    expect("phone" in empty).toBe(false);
  });

  it("includes qualification only when set", () => {
    const off = buildStartPayload(baseValues, "Ana", "", 1);
    expect("qualification" in off).toBe(false);
    const on = buildStartPayload(
      { ...baseValues, qualification: "brand_company" },
      "Ana",
      "",
      1,
    );
    expect(on.qualification).toBe("brand_company");
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

  it("omits handle when not provided, includes it when given", () => {
    const noHandle = buildStartPayload(baseValues, "Ana", "", 1);
    expect("handle" in noHandle).toBe(false);
    const withHandle = buildStartPayload(baseValues, "Ana", "", 1, "frederico.m.carvalho");
    expect(withHandle.handle).toBe("frederico.m.carvalho");
  });
});