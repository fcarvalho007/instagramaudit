import { describe, expect, it } from "vitest";

import { buildChromeSections } from "../chrome/chrome-sections";
import { EDITORIAL_V2_DISPLAY_NUMBERS } from "../section-metadata";

describe("chrome sections (Editorial V2)", () => {
  it("não-Pro: mostra 00–04 + item colapsado sem número", () => {
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
      "",
    ]);
  });

  it("Pro: mostra sequência completa 00–07", () => {
    const sections = buildChromeSections({
      premiumUnlocked: true,
      leadCaptured: true,
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

  it("não-Pro: usa âncoras reais + item colapsado 'outros-campos-pro'", () => {
    const sections = buildChromeSections({
      premiumUnlocked: false,
      leadCaptured: false,
    });
    expect(sections.map((s) => s.id)).toEqual([
      "visao-geral",
      "engagement",
      "frequencia",
      "formatos",
      "publicacoes-chave",
      "outros-campos-pro",
    ]);
  });

  it("Pro: usa todas as âncoras reais", () => {
    const sections = buildChromeSections({
      premiumUnlocked: true,
      leadCaptured: true,
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
    expect(anon.find((s) => s.id === "outros-campos-pro")?.access).toBe(
      "locked",
    );
    expect(anon.find((s) => s.id === "visao-geral")?.access).toBe("accessible");

    const lead = buildChromeSections({
      premiumUnlocked: false,
      leadCaptured: true,
    });
    // Item colapsado usa tier pro → locked mesmo com email capturado
    expect(lead.find((s) => s.id === "outros-campos-pro")?.access).toBe(
      "locked",
    );

    const pro = buildChromeSections({
      premiumUnlocked: true,
      leadCaptured: true,
    });
    expect(pro.every((s) => s.access === "accessible")).toBe(true);
  });

  it("item colapsado tem scrollTargetId para 'conversas' e rótulo correcto", () => {
    const sections = buildChromeSections({
      premiumUnlocked: false,
      leadCaptured: false,
    });
    const collapsed = sections.find((s) => s.id === "outros-campos-pro");
    expect(collapsed).toBeDefined();
    expect(collapsed?.label).toBe("outros campos no pro");
    expect(collapsed?.scrollTargetId).toBe("conversas");
  });

  it("Pro: item colapsado não existe (secções individuais)", () => {
    const sections = buildChromeSections({
      premiumUnlocked: true,
      leadCaptured: true,
    });
    expect(sections.find((s) => s.id === "outros-campos-pro")).toBeUndefined();
    expect(sections.find((s) => s.id === "conversas")).toBeDefined();
    expect(sections.find((s) => s.id === "diagnostico-editorial")).toBeDefined();
    expect(sections.find((s) => s.id === "prioridades")).toBeDefined();
  });

  it("aplica rótulos encurtados do LABEL_MAP", () => {
    const sections = buildChromeSections({
      premiumUnlocked: true,
      leadCaptured: true,
    });
    expect(sections.find((s) => s.id === "visao-geral")?.label).toBe("Visão");
    expect(sections.find((s) => s.id === "frequencia")?.label).toBe("Cadência");
    expect(sections.find((s) => s.id === "formatos")?.label).toBe("Formatos");
    expect(sections.find((s) => s.id === "publicacoes-chave")?.label).toBe(
      "Melhor vs Pior",
    );
  });
});
