/**
 * Guarda estrutural — consistência dos headers dos cards analíticos V2.
 *
 * Impede a regressão introduzida nas rondas Card Review 04/05, em que
 * Frequência e Formato passaram a usar um título em bloco em vez do
 * padrão inline canónico do card Engagement.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), "src/components/report-redesign");

const read = (relative: string) =>
  readFileSync(join(ROOT, relative), "utf8");

const CARDS = {
  engagement: "v2/report-overview-engagement.tsx",
  frequency: "v2/overview/frequency-card.tsx",
  format: "v2/overview/format-card.tsx",
} as const;

describe("header consistency — cards analíticos V2", () => {
  it("nenhum card usa qualifierPlacement", () => {
    for (const path of Object.values(CARDS)) {
      expect(read(path)).not.toContain("qualifierPlacement");
    }
  });

  it("Engagement, Frequência e Formato usam ReportCardSectionHeader", () => {
    for (const path of Object.values(CARDS)) {
      expect(read(path)).toContain("<ReportCardSectionHeader");
    }
  });

  it("o componente de header não expõe variante em bloco", () => {
    const source = read("v2/report-card-section-header.tsx");
    expect(source).not.toContain("qualifierPlacement");
    expect(source).not.toContain("BLOCK_QUALIFIER_COLOR");
  });

  it("o título dos cards vem do token comum", () => {
    const source = read("v2/report-card-section-header.tsx");
    expect(source).toContain("REPORT_SECTION_HEADER_TOKENS as T");
    expect(source).toContain("<h3 className={T.title}>");
  });
});
