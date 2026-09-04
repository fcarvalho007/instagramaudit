import { describe, expect, it } from "vitest";

import { buildChromeSections } from "../chrome/chrome-sections";
import { EDITORIAL_V2_DISPLAY_NUMBERS } from "../section-metadata";

describe("chrome sections (Editorial V2)", () => {
  it("segue a sequência editorial 00 → 07 sem secção 08", () => {
    const sections = buildChromeSections({
      premiumUnlocked: false,
      leadCaptured: false,
    });
    expect(sections.map((s) => s.displayNumber)).toEqual([
      "00",
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
    ]);
  });

  it("usa as âncoras reais renderizadas pelas secções", () => {
    const sections = buildChromeSections({
      premiumUnlocked: false,
      leadCaptured: false,
    });
    expect(sections.map((s) => s.id)).toEqual(
      Object.keys(EDITORIAL_V2_DISPLAY_NUMBERS),
    );
  });

  it("não expõe blocos internos de laboratório", () => {
    const ids = buildChromeSections({
      premiumUnlocked: true,
      leadCaptured: true,
    }).map((s) => s.id);
    for (const labOnly of ["performance", "conteudo", "procura", "benchmark"]) {
      expect(ids).not.toContain(labOnly);
    }
  });

  it("aplica o gating de produção por estado de acesso", () => {
    const anon = buildChromeSections({
      premiumUnlocked: false,
      leadCaptured: false,
    });
    expect(anon.find((s) => s.id === "conversas")?.access).toBe("locked");
    expect(anon.find((s) => s.id === "prioridades")?.access).toBe("locked");
    expect(anon.find((s) => s.id === "visao-geral")?.access).toBe("accessible");

    const lead = buildChromeSections({
      premiumUnlocked: false,
      leadCaptured: true,
    });
    expect(lead.find((s) => s.id === "conversas")?.access).toBe("accessible");
    expect(lead.find((s) => s.id === "diagnostico-editorial")?.access).toBe(
      "locked",
    );

    const pro = buildChromeSections({
      premiumUnlocked: true,
      leadCaptured: true,
    });
    expect(pro.every((s) => s.access === "accessible")).toBe(true);
  });
});
