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
      gdpr_consent: true,
    });
    expect(r.success).toBe(false);
  });

  it("accepts a complete valid payload (without pricing)", () => {
    const r = unlockFormSchema.safeParse({
      full_name: "Ana Marques",
      email: "Ana@Empresa.PT",
      profile_ownership: "own_profile",
      goal: "improve_content",
      user_type: "creator",
      gdpr_consent: true,
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("ana@empresa.pt");
  });

  it("still accepts pricing_preference if provided (back-compat)", () => {
    const r = unlockFormSchema.safeParse({
      full_name: "Ana Marques",
      email: "ana@empresa.pt",
      profile_ownership: "own_profile",
      goal: "improve_content",
      user_type: "creator",
      pricing_preference: "under_9",
      gdpr_consent: true,
    });
    expect(r.success).toBe(true);
  });

  it("requires all qualitative fields", () => {
    const r = unlockFormSchema.safeParse({ email: "a@b.pt" });
    expect(r.success).toBe(false);
  });

  it("requires gdpr_consent to be true", () => {
    const r = unlockFormSchema.safeParse({
      email: "ana@empresa.pt",
      profile_ownership: "own_profile",
      goal: "improve_content",
      user_type: "creator",
    });
    expect(r.success).toBe(false);
  });

  it("requires goal_other_text when goal is 'other'", () => {
    const r = unlockFormSchema.safeParse({
      email: "ana@empresa.pt",
      profile_ownership: "own_profile",
      goal: "other",
      user_type: "creator",
      gdpr_consent: true,
    });
    expect(r.success).toBe(false);
  });

  it("accepts goal='other' with goal_other_text", () => {
    const r = unlockFormSchema.safeParse({
      full_name: "Ana Marques",
      email: "ana@empresa.pt",
      profile_ownership: "competitor_research",
      goal: "other",
      goal_other_text: "Crescer em LATAM",
      user_type: "creator",
      gdpr_consent: true,
    });
    expect(r.success).toBe(true);
  });

  it("accepts optional phone", () => {
    const r = unlockFormSchema.safeParse({
      full_name: "Ana Marques",
      email: "ana@empresa.pt",
      profile_ownership: "own_profile",
      goal: "improve_content",
      user_type: "creator",
      phone: "+351 912 345 678",
      gdpr_consent: true,
    });
    expect(r.success).toBe(true);
  });

  it("requires letter+number in password (rejects all-letters)", () => {
    const r = unlockFormSchema.safeParse({
      full_name: "Ana",
      email: "a@b.pt",
      profile_ownership: "own_profile",
      goal: "improve_content",
      user_type: "creator",
      gdpr_consent: true,
      password: "abcdefgh",
      confirm_password: "abcdefgh",
    });
    expect(r.success).toBe(false);
  });

  it("requires letter+number in password (rejects all-digits)", () => {
    const r = unlockFormSchema.safeParse({
      full_name: "Ana",
      email: "a@b.pt",
      profile_ownership: "own_profile",
      goal: "improve_content",
      user_type: "creator",
      gdpr_consent: true,
      password: "12345678",
      confirm_password: "12345678",
    });
    expect(r.success).toBe(false);
  });

  it("rejects mismatched confirm_password", () => {
    const r = unlockFormSchema.safeParse({
      full_name: "Ana",
      email: "a@b.pt",
      profile_ownership: "own_profile",
      goal: "improve_content",
      user_type: "creator",
      gdpr_consent: true,
      password: "abc12345",
      confirm_password: "abc12346",
    });
    expect(r.success).toBe(false);
  });

  it("accepts compliant password (8+ chars, letter+number, matching)", () => {
    const r = unlockFormSchema.safeParse({
      full_name: "Ana",
      email: "a@b.pt",
      profile_ownership: "own_profile",
      goal: "improve_content",
      user_type: "creator",
      gdpr_consent: true,
      password: "abc12345",
      confirm_password: "abc12345",
    });
    expect(r.success).toBe(true);
  });
});
