import { describe, expect, it } from "vitest";
import {
  PROFILE_OWNERSHIPS as CLIENT_PO,
  GOALS as CLIENT_GOALS,
  USER_TYPES as CLIENT_UT,
  unlockFormSchema,
} from "@/lib/unlock-flow";
import {
  PROFILE_OWNERSHIPS as SERVER_PO,
  GOALS as SERVER_GOALS,
  USER_TYPES as SERVER_UT,
} from "@/lib/unlock.server";

describe("unlock-flow enums parity with server", () => {
  it("profile ownership tuples match", () => {
    expect([...CLIENT_PO]).toEqual([...SERVER_PO]);
  });
  it("goals tuples match", () => {
    expect([...CLIENT_GOALS]).toEqual([...SERVER_GOALS]);
  });
  it("user types tuples match", () => {
    expect([...CLIENT_UT]).toEqual([...SERVER_UT]);
  });
});

describe("unlockFormSchema", () => {
  it("rejects invalid email", () => {
    const r = unlockFormSchema.safeParse({
      email: "not-an-email",
      profile_ownership: "own_profile",
      goal: "improve_content",
      user_type: "creator",
      pricing_preference: "free_only",
    });
    expect(r.success).toBe(false);
  });

  it("accepts a complete valid payload", () => {
    const r = unlockFormSchema.safeParse({
      email: "Ana@Empresa.PT",
      profile_ownership: "own_profile",
      goal: "improve_content",
      user_type: "creator",
      pricing_preference: "under_9",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("ana@empresa.pt");
  });

  it("requires all qualitative fields", () => {
    const r = unlockFormSchema.safeParse({ email: "a@b.pt" });
    expect(r.success).toBe(false);
  });
});
