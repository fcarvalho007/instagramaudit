import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import {
  INSTAGRAM_BENCHMARK_CONTEXT,
  BENCHMARK_DATASET_VERSION,
} from "@/lib/knowledge/benchmark-context";
import { getVariantFeatures } from "@/lib/report/report-variant";

import {
  buildEditorialMethodologyData,
  normaliseCollectedAt,
} from "../methodology/methodology-data";

const publicFeatures = getVariantFeatures("public_mvp");
const labFeatures = getVariantFeatures("internal_lab");

describe("Editorial V2 · metodologia e fontes", () => {
  it("usa apenas fontes activas do registo de produção", () => {
    const data = buildEditorialMethodologyData({
      features: publicFeatures,
      analyzedAt: "04 Set 2026",
    });
    const expected = INSTAGRAM_BENCHMARK_CONTEXT.sources.filter(
      (s) => s.visibility === "active" && s.uiDisplayAllowed,
    );
    expect(data.sources).toHaveLength(expected.length);
    expect(data.sources.map((s) => s.name)).toEqual(expected.map((s) => s.name));
    // Databox está marcada `future` e nunca pode aparecer.
    expect(data.sources.map((s) => s.name)).not.toContain("Databox");
  });

  it("os nomes e descrições vêm do registo, não de literais locais", () => {
    const data = buildEditorialMethodologyData({
      features: publicFeatures,
      analyzedAt: null,
    });
    for (const source of data.sources) {
      const registry = INSTAGRAM_BENCHMARK_CONTEXT.sources.find(
        (s) => s.name === source.name,
      );
      expect(registry).toBeDefined();
      expect(source.description).toBe(registry!.shortDescription);
      expect(source.url).toBe(registry!.url);
    }
  });

  it("não inventa data quando a fonte não tem etiqueta nem ano", () => {
    const fake = {
      name: "Fonte X",
      shortDescription: "Descrição real.",
      url: "",
      visibility: "active",
      uiDisplayAllowed: true,
      publishedYear: Number.NaN,
    };
    const mapped = {
      name: fake.name,
      dateLabel: Number.isFinite(fake.publishedYear)
        ? String(fake.publishedYear)
        : null,
      url: fake.url.startsWith("http") ? fake.url : null,
    };
    expect(mapped.dateLabel).toBeNull();
    expect(mapped.url).toBeNull();
  });

  it("usa a versão real do dataset de benchmark", () => {
    const data = buildEditorialMethodologyData({
      features: publicFeatures,
      analyzedAt: null,
    });
    expect(data.datasetVersion).toBe(BENCHMARK_DATASET_VERSION);
  });

  it("a data de recolha vem do snapshot e é omitida quando desconhecida", () => {
    expect(normaliseCollectedAt("—")).toBeNull();
    expect(normaliseCollectedAt("")).toBeNull();
    expect(normaliseCollectedAt(null)).toBeNull();
    expect(normaliseCollectedAt("04 Set 2026")).toBe("04 Set 2026");
    const data = buildEditorialMethodologyData({
      features: publicFeatures,
      analyzedAt: "—",
    });
    expect(data.collectedAt).toBeNull();
  });

  it("não expõe sinais de procura no relatório público", () => {
    const pub = buildEditorialMethodologyData({
      features: publicFeatures,
      analyzedAt: null,
    });
    expect(pub.dimensions.map((d) => d.id)).toEqual([
      "collection",
      "market_reference",
      "editorial_reading",
    ]);

    const lab = buildEditorialMethodologyData({
      features: labFeatures,
      analyzedAt: null,
    });
    expect(lab.dimensions.map((d) => d.id)).toContain("demand_signals");
  });

  it("não contém nomes de fontes hardcoded na apresentação", () => {
    const component = readFileSync(
      "src/components/report-editorial-v2/methodology/editorial-methodology.tsx",
      "utf8",
    );
    for (const literal of ["Socialinsider", "Buffer", "Hootsuite", "Databox"]) {
      expect(component).not.toContain(literal);
    }
    // Sem datas do HTML de referência nem links falsos.
    expect(component).not.toContain('href="#"');
    expect(component).not.toMatch(/20\d{2}-\d{2}-\d{2}/);
  });

  it("o rodapé Editorial V2 não inventa rotas nem duplica o rodapé do site", () => {
    const footer = readFileSync(
      "src/components/report-editorial-v2/methodology/editorial-report-footer.tsx",
      "utf8",
    );
    const hrefs = [...footer.matchAll(/href=\{?"([^"{}]+)"/g)].map((m) => m[1]!);
    expect(hrefs).toHaveLength(0);
    expect(footer).not.toContain('href="#"');
    expect(footer).toContain("Não afiliado com");
  });

  it("a metodologia de produção continua a ser renderizada pelo shell V2", () => {
    const shell = readFileSync(
      "src/components/report-redesign/v2/report-shell-v2.tsx",
      "utf8",
    );
    expect(shell).toContain("{unlocked && <ReportMethodology />}");
  });

  it("a metodologia Editorial V2 só existe dentro da variante Editorial V2", () => {
    const shell = readFileSync(
      "src/components/report-editorial-v2/editorial-v2-shell.tsx",
      "utf8",
    );
    expect(shell).toContain("EditorialMethodology");
    const prodShell = readFileSync(
      "src/components/report-redesign/v2/report-shell-v2.tsx",
      "utf8",
    );
    expect(prodShell).not.toContain("EditorialMethodology");
    expect(prodShell).not.toContain("EditorialReportFooter");
  });
});
