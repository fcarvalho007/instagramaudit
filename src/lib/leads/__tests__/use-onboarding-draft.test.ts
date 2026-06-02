import { describe, expect, it } from "vitest";

import {
  selectDraftForHandle,
  type OnboardingDraft,
} from "@/lib/leads/use-onboarding-draft";

const fullDraft: OnboardingDraft = {
  full_name: "Ana Marques",
  email: "ana@example.com",
  phone: "+351912345678",
  profile_ownership: "own_profile",
  goal: "improve_content",
  marketing_consent: true,
  last_handle: "frederico.m.carvalho",
};

describe("selectDraftForHandle", () => {
  it("returns null when draft is null", () => {
    expect(selectDraftForHandle(null, "any")).toBeNull();
  });

  it("restores everything when handle matches last_handle", () => {
    const out = selectDraftForHandle(fullDraft, "frederico.m.carvalho");
    expect(out).toEqual(fullDraft);
  });

  it("resets profile_ownership and goal when handle changes", () => {
    const out = selectDraftForHandle(fullDraft, "other.handle");
    expect(out?.profile_ownership).toBeUndefined();
    expect(out?.goal).toBeUndefined();
    expect(out?.full_name).toBe(fullDraft.full_name);
    expect(out?.email).toBe(fullDraft.email);
    expect(out?.phone).toBe(fullDraft.phone);
    expect(out?.marketing_consent).toBe(true);
  });

  it("treats missing last_handle as a handle mismatch (resets context)", () => {
    const draft: OnboardingDraft = { ...fullDraft, last_handle: undefined };
    const out = selectDraftForHandle(draft, "frederico.m.carvalho");
    expect(out?.profile_ownership).toBeUndefined();
    expect(out?.goal).toBeUndefined();
    expect(out?.full_name).toBe(fullDraft.full_name);
  });
});