import { describe, expect, it } from "vitest";

import { COMMERCIAL_SECTIONS } from "@/components/report-redesign/v2/block-config";
import { PUBLIC_PRODUCTS } from "@/lib/payments/products";

import {
  EDITORIAL_V2_DISPLAY_NUMBERS,
  EDITORIAL_V2_PRO_SECTIONS,
  EDITORIAL_V2_SECTIONS,
} from "../section-metadata";

describe("Editorial V2 — gate Pro (apresentação)", () => {
  it("lista exactamente as secções Pro públicas de produção", () => {
    const productionPro = COMMERCIAL_SECTIONS.filter((s) => s.tier === "pro").map(
      (s) => s.id,
    );
    expect(EDITORIAL_V2_PRO_SECTIONS.map((s) => s.id)).toEqual(productionPro);
  });

  it("usa a sequência editorial própria (06/07), não a numeração de produção", () => {
    expect(EDITORIAL_V2_PRO_SECTIONS.map((s) => s.displayNumber)).toEqual([
      "06",
      "07",
    ]);
  });

  it("não existe secção 08 na sequência editorial", () => {
    expect(
      Object.values(EDITORIAL_V2_DISPLAY_NUMBERS).includes("08"),
    ).toBe(false);
    expect(EDITORIAL_V2_SECTIONS[0]!.displayNumber).toBe("00");
  });


  it("não inventa secções Pro adicionais", () => {
    expect(EDITORIAL_V2_PRO_SECTIONS).toHaveLength(2);
  });

  it("o preço vem do catálogo de produtos, não está escrito à mão", () => {
    expect(PUBLIC_PRODUCTS.report_full_9.priceLabel).toBeTruthy();
  });
});
