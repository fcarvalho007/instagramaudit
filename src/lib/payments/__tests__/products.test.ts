import { describe, expect, it } from "vitest";

import { PRODUCT_CODES, PUBLIC_PRODUCTS, isProductCode } from "../products";
import { SERVER_PRODUCTS, getServerProduct } from "../products.server";

describe("payments/products", () => {
  it("server catalogue covers every public code", () => {
    for (const code of PRODUCT_CODES) {
      expect(SERVER_PRODUCTS[code]).toBeDefined();
      expect(PUBLIC_PRODUCTS[code]).toBeDefined();
    }
  });

  it("authority_diagnosis_49 is 4900 cents EUR and exposed", () => {
    const sp = getServerProduct("authority_diagnosis_49");
    expect(sp.amountCents).toBe(4900);
    expect(sp.currency).toBe("EUR");
    expect(PUBLIC_PRODUCTS.authority_diagnosis_49.exposed).toBe(true);
  });

  it("report_full_9 is 900 cents EUR and hidden", () => {
    const sp = getServerProduct("report_full_9");
    expect(sp.amountCents).toBe(900);
    expect(sp.currency).toBe("EUR");
    expect(PUBLIC_PRODUCTS.report_full_9.exposed).toBe(false);
  });

  it("isProductCode rejects unknown values", () => {
    expect(isProductCode("authority_diagnosis_49")).toBe(true);
    expect(isProductCode("anything_else")).toBe(false);
    expect(isProductCode(null)).toBe(false);
    expect(isProductCode(undefined)).toBe(false);
  });

  it("getServerProduct throws on unknown code", () => {
    expect(() =>
      getServerProduct("unknown" as unknown as "authority_diagnosis_49"),
    ).toThrow();
  });
});