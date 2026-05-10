import { describe, expect, it } from "vitest";

import {
  buildUnlockCheckResponse,
  type LeadRowForCheck,
} from "@/routes/api/public/unlock-check";

describe("buildUnlockCheckResponse", () => {
  it("returns negative shape when lead is missing", () => {
    const r = buildUnlockCheckResponse(null);
    expect(r.exists).toBe(false);
    expect(r.knownFields).toEqual([]);
    expect(r.missingFields).toEqual([
      "profile_ownership",
      "goal",
      "user_type",
    ]);
    expect(r.display.firstName).toBeNull();
  });

  it("marks every qualification field as known when lead is fully qualified", () => {
    const lead: LeadRowForCheck = {
      profile_ownership: "self",
      purpose: "grow",
      user_type: "creator",
      name: "Ana Maria Silva",
    };
    const r = buildUnlockCheckResponse(lead);
    expect(r.exists).toBe(true);
    expect(r.knownFields).toEqual([
      "profile_ownership",
      "goal",
      "user_type",
    ]);
    expect(r.missingFields).toEqual([]);
    expect(r.display.firstName).toBe("Ana");
  });

  it("partial qualification splits known and missing", () => {
    const lead: LeadRowForCheck = {
      profile_ownership: "self",
      purpose: null,
      user_type: null,
      name: null,
    };
    const r = buildUnlockCheckResponse(lead);
    expect(r.exists).toBe(true);
    expect(r.knownFields).toEqual(["profile_ownership"]);
    expect(r.missingFields).toEqual(["goal", "user_type"]);
    expect(r.display.firstName).toBeNull();
  });

  it("translates DB column 'purpose' into form field 'goal'", () => {
    const lead: LeadRowForCheck = {
      profile_ownership: null,
      purpose: "audit",
      user_type: null,
      name: "  ",
    };
    const r = buildUnlockCheckResponse(lead);
    expect(r.knownFields).toEqual(["goal"]);
    expect(r.display.firstName).toBeNull();
  });

  it("caps firstName length to 40 chars", () => {
    const long = "A".repeat(80);
    const lead: LeadRowForCheck = {
      profile_ownership: null,
      purpose: null,
      user_type: null,
      name: long,
    };
    const r = buildUnlockCheckResponse(lead);
    expect(r.display.firstName).toHaveLength(40);
  });
});