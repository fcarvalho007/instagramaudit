/**
 * Phase 3 — locks the onboarding-first copy contract.
 *
 * If any of these keys change shape, the user-facing flow regresses:
 *  - the analyze route would show a raw error code instead of friendly text
 *    for ONBOARDING_REQUIRED / INSUFFICIENT_CREDITS
 *  - the OnboardingModal intro would lose the @handle context or the
 *    "1 credit / 2 free credits" expectation-management line.
 */
import { describe, expect, it } from "vitest";

import enErrors from "@/i18n/locales/en/errors.json";
import ptErrors from "@/i18n/locales/pt/errors.json";
import enGate from "@/i18n/locales/en/gate.json";
import ptGate from "@/i18n/locales/pt/gate.json";

type Errors = Record<string, string>;
type Gate = {
  onboarding: {
    intro: {
      handleContext: string;
      creditNote: string;
      freeValue: string[];
      cta: string;
    };
    errors: { generic: string; network: string };
  };
};

const LOCALES: Array<[string, Errors, Gate]> = [
  ["en", enErrors as Errors, enGate as unknown as Gate],
  ["pt", ptErrors as Errors, ptGate as unknown as Gate],
];

const RAW_LEAK =
  /\b(402|payment\s*required|onboarding_required|insufficient_credits)\b/i;

describe.each(LOCALES)("[%s] onboarding gate copy", (locale, errors, gate) => {
  it("has friendly ONBOARDING_REQUIRED text (no raw code / 402 leak)", () => {
    const msg = errors.ONBOARDING_REQUIRED;
    expect(msg, `errors.ONBOARDING_REQUIRED missing for ${locale}`).toBeTruthy();
    expect(msg).not.toMatch(RAW_LEAK);
    expect(msg.length).toBeGreaterThan(10);
  });

  it("has friendly INSUFFICIENT_CREDITS text (no raw code / 402 leak)", () => {
    const msg = errors.INSUFFICIENT_CREDITS;
    expect(msg, `errors.INSUFFICIENT_CREDITS missing for ${locale}`).toBeTruthy();
    expect(msg).not.toMatch(RAW_LEAK);
    expect(msg.length).toBeGreaterThan(5);
  });

  it("intro.handleContext interpolates {{handle}}", () => {
    expect(gate.onboarding.intro.handleContext).toContain("{{handle}}");
  });

  it("intro.creditNote names both the cost (1) and the starting balance (2)", () => {
    const note = gate.onboarding.intro.creditNote;
    expect(note).toMatch(/\b1\b/);
    expect(note).toMatch(/\b2\b/);
  });

  it("intro.freeValue lists at least 3 deliverables", () => {
    expect(Array.isArray(gate.onboarding.intro.freeValue)).toBe(true);
    expect(gate.onboarding.intro.freeValue.length).toBeGreaterThanOrEqual(3);
  });

  it("intro.cta is a short, non-empty button label", () => {
    expect(gate.onboarding.intro.cta).toBeTruthy();
    expect(gate.onboarding.intro.cta.length).toBeLessThan(40);
  });

  it("has generic + network onboarding error fallbacks (leak-free)", () => {
    expect(gate.onboarding.errors.generic).toBeTruthy();
    expect(gate.onboarding.errors.network).toBeTruthy();
    expect(gate.onboarding.errors.generic).not.toMatch(RAW_LEAK);
    expect(gate.onboarding.errors.network).not.toMatch(RAW_LEAK);
  });
});