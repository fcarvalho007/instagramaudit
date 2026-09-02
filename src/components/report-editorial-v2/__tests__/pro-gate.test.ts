import { describe, expect, it } from "vitest";

import { COMMERCIAL_SECTIONS } from "@/components/report-redesign/v2/block-config";
import { PUBLIC_PRODUCTS } from "@/lib/payments/products";

import { EDITORIAL_V2_PRO_SECTIONS } from "../section-metadata";

describe("Editorial V2 — gate Pro (apresentação)", () => {
  it("lista exactamente as secções Pro públicas de produção", () => {
    const productionPro = COMMERCIAL_SECTIONS.filter((s) => s.tier === "pro").map(
      (s) => s.id,
    );
    expect(EDITORIAL_V2_PRO_SECTIONS.map((s) => s.id)).toEqual(productionPro);
  });

  it("usa os rótulos numéricos da sidebar de produção", () => {
    const byId = new Map(COMMERCIAL_SECTIONS.map((s) => [s.id, s.number]));
    for (const s of EDITORIAL_V2_PRO_SECTIONS) {
      expect(s.displayNumber).toBe(byId.get(s.id));
    }
  });

  it("não inventa secções Pro adicionais", () => {
    expect(EDITORIAL_V2_PRO_SECTIONS).toHaveLength(2);
  });

  it("o preço vem do catálogo de produtos, não está escrito à mão", () => {
    expect(PUBLIC_PRODUCTS.report_full_9.priceLabel).toBeTruthy();
  });
});
