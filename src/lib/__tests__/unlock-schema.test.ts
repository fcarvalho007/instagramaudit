import { describe, it, expect } from "vitest";

import { reportUnlockSchema } from "@/lib/unlock.server";

const validBase = {
  email: "Ana@Empresa.PT",
  instagram_username: "@frederico.m.carvalho",
  analysis_snapshot_id: "11111111-2222-3333-4444-555555555555",
};

describe("reportUnlockSchema", () => {
  it("accepts the minimal valid payload and normalizes email + handle", () => {
    const r = reportUnlockSchema.safeParse(validBase);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("ana@empresa.pt");
      expect(r.data.instagram_username).toBe("frederico.m.carvalho");
    }
  });

  it("rejects an invalid email", () => {
    const r = reportUnlockSchema.safeParse({ ...validBase, email: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("rejects a missing snapshot id", () => {
    const { analysis_snapshot_id: _omit, ...rest } = validBase;
    const r = reportUnlockSchema.safeParse(rest);
    expect(r.success).toBe(false);
  });

  it("rejects a non-uuid snapshot id", () => {
    const r = reportUnlockSchema.safeParse({
      ...validBase,
      analysis_snapshot_id: "abc",
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown extra keys (strict)", () => {
    const r = reportUnlockSchema.safeParse({
      ...validBase,
      malicious_field: "<script>",
    });
    expect(r.success).toBe(false);
  });

  it("accepts all qualification fields", () => {
    const r = reportUnlockSchema.safeParse({
      ...validBase,
      profile_ownership: "own_profile",
      goal: "improve_content",
      user_type: "creator",
      pricing_preference: "subscription_monthly",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an invalid enum value for goal", () => {
    const r = reportUnlockSchema.safeParse({
      ...validBase,
      goal: "make_money_fast",
    });
    expect(r.success).toBe(false);
  });

  it("strips an @ prefix from the instagram username", () => {
    const r = reportUnlockSchema.safeParse({
      ...validBase,
      instagram_username: "@HandleCASE",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.instagram_username).toBe("handlecase");
  });
});