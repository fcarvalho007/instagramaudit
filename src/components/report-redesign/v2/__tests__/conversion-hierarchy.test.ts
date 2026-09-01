import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Hierarquia de conversão em três degraus:
 *   Nível 1 — auditoria instantânea (grátis, sem email)
 *   Nível 2 — auditoria completa (grátis com email)
 *   Nível 3 — Análise Pro (9€)
 *
 * Regra de vocabulário: o nível 2 nunca usa "desbloquear" nem preço, e
 * "porquê"/"o que fazer" pertencem exclusivamente ao nível 3.
 */
const pt = JSON.parse(
  readFileSync(resolve(process.cwd(), "src/i18n/locales/pt/conversion.json"), "utf8"),
) as Record<string, any>;

const LEVEL_2_COPY: string[] = [
  pt.gate.title,
  pt.gate.body,
  pt.gate.cta,
  pt.subcopy,
  pt.submit,
  pt.cta.comment_intelligence,
  pt.cta.report_end,
  pt.headline.comment_intelligence,
  pt.headline.report_end,
  pt.deepen.title,
  pt.deepen.body,
];

describe("conversion hierarchy — nível 2 (grátis com email)", () => {
  it("nunca usa o verbo 'desbloquear'", () => {
    for (const copy of LEVEL_2_COPY) {
      expect(copy.toLowerCase()).not.toContain("desbloque");
    }
  });

  it("nunca mostra preço", () => {
    for (const copy of LEVEL_2_COPY) {
      expect(copy).not.toMatch(/\d\s*€|€\s*\d/);
    }
  });

  it("não promete o 'porquê' nem o plano de acção do Pro", () => {
    for (const copy of LEVEL_2_COPY) {
      expect(copy.toLowerCase()).not.toContain("porquê");
      expect(copy.toLowerCase()).not.toContain("o que fazer");
    }
  });
});

describe("conversion hierarchy — nível 3 (Pro)", () => {
  const sticky = readFileSync(
    resolve(process.cwd(), "src/components/report-redesign/v2/sticky-unlock-bar.tsx"),
    "utf8",
  );

  it("a barra sticky Pro mantém preço e verbo 'Desbloquear'", () => {
    expect(sticky).toContain("Desbloquear Pro");
    expect(sticky).toContain("priceLabel");
  });

  it("a barra sticky Pro deixou de repetir o 'porquê' do gate gratuito", () => {
    expect(sticky).not.toContain("Agora falta perceber porquê");
  });
});
