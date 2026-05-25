import { describe, expect, it } from "vitest";

import { LEGAL } from "@/lib/brand/legal";
import gatePt from "@/i18n/locales/pt/gate.json";
import gateEn from "@/i18n/locales/en/gate.json";

describe("LEGAL identity", () => {
  it("privacyEmail is a valid-looking email", () => {
    expect(LEGAL.privacyEmail).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i);
  });

  it("postal code matches Portuguese format NNNN-NNN", () => {
    expect(LEGAL.address.postalCode).toMatch(/^\d{4}-\d{3}$/);
  });

  it("address.full contains street, postal code and city", () => {
    expect(LEGAL.address.full).toContain(LEGAL.address.street);
    expect(LEGAL.address.full).toContain(LEGAL.address.postalCode);
    expect(LEGAL.address.full).toContain(LEGAL.address.city);
  });
});

describe("LEGAL ↔ i18n gate.json drift guard", () => {
  it("unlock.operator.name (pt) matches LEGAL.companyName", () => {
    expect(gatePt.unlock.operator.name).toBe(LEGAL.companyName);
  });

  it("unlock.operator.name (en) matches LEGAL.companyName", () => {
    expect(gateEn.unlock.operator.name).toBe(LEGAL.companyName);
  });

  it("unlock.operator.city (pt) matches LEGAL.operatorCity", () => {
    expect(gatePt.unlock.operator.city).toBe(LEGAL.operatorCity);
  });

  it("unlock.operator.city (en) matches LEGAL.operatorCity", () => {
    expect(gateEn.unlock.operator.city).toBe(LEGAL.operatorCity);
  });
});