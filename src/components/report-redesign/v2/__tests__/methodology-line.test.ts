import { describe, it, expect } from "vitest";
import ptReport from "@/i18n/locales/pt/report.json";
import enReport from "@/i18n/locales/en/report.json";

/**
 * Pure-copy tests for the Block 1 methodology line. Mirrors the selection
 * logic in `MethodologyLine` without rendering React (vitest runs in node).
 */
function resolve(json: Record<string, unknown>, dottedKey: string): string {
  return dottedKey
    .split(".")
    .reduce<unknown>((acc, k) => {
      if (acc && typeof acc === "object" && k in (acc as object)) {
        return (acc as Record<string, unknown>)[k];
      }
      return undefined;
    }, json) as string;
}

function interpolate(template: string, params?: Record<string, unknown>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    params[k] !== undefined ? String(params[k]) : `{{${k}}}`,
  );
}

function pickMain(args: {
  count: number;
  observedDays: number;
  sufficient: boolean;
}): { key: string; params?: Record<string, unknown> } {
  const { count, observedDays, sufficient } = args;
  if (!sufficient || count <= 0) {
    return { key: "posts.methodology.insufficient" };
  }
  if (count === 1) {
    return { key: "posts.methodology.line_one", params: { days: observedDays } };
  }
  return {
    key: "posts.methodology.line_other",
    params: { count, days: observedDays },
  };
}

function render(args: { count: number; observedDays: number; sufficient: boolean }) {
  const picked = pickMain(args);
  return {
    pt: interpolate(resolve(ptReport, picked.key), picked.params),
    en: interpolate(resolve(enReport, picked.key), picked.params),
  };
}

describe("Block 1 methodology line copy", () => {
  it("sufficient + count=12 + days=42 → menciona contagem e dias", () => {
    const { pt, en } = render({ count: 12, observedDays: 42, sufficient: true });
    expect(pt).toBe(
      "Análise baseada nas últimas 12 publicações disponíveis · Período observado: 42 dias.",
    );
    expect(en).toBe(
      "Analysis based on the latest 12 available posts · Observed period: 42 days.",
    );
  });

  it("sufficient + count=1 → variante singular", () => {
    const { pt, en } = render({ count: 1, observedDays: 3, sufficient: true });
    expect(pt).toBe(
      "Análise baseada na última publicação disponível · Período observado: 3 dia(s).",
    );
    expect(en).toBe(
      "Analysis based on the latest available post · Observed period: 3 day(s).",
    );
  });

  it("insufficient → copy reduzida sem prometer leitura conclusiva", () => {
    const { pt, en } = render({ count: 5, observedDays: 90, sufficient: false });
    expect(pt).toBe("Amostra reduzida: poucos dados disponíveis para uma leitura conclusiva.");
    expect(en).toBe("Limited sample: not enough data for a conclusive reading.");
  });

  it("count<=0 → fallback insuficiente mesmo se sufficient=true", () => {
    const { pt } = render({ count: 0, observedDays: 30, sufficient: true });
    expect(pt).toBe("Amostra reduzida: poucos dados disponíveis para uma leitura conclusiva.");
  });

  it("nota de exclusões existe em ambos os idiomas", () => {
    expect(resolve(ptReport, "posts.methodology.exclusions_note")).toBe(
      "Publicações fixadas ou demasiado antigas podem ser excluídas dos cálculos de desempenho.",
    );
    expect(resolve(enReport, "posts.methodology.exclusions_note")).toBe(
      "Pinned or unusually old posts may be excluded from performance calculations.",
    );
  });
});