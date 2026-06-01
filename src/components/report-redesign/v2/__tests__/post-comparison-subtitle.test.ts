import { describe, it, expect } from "vitest";
import ptReport from "@/i18n/locales/pt/report.json";
import enReport from "@/i18n/locales/en/report.json";
import { pickSubtitleKey } from "../report-post-comparison";

/** Resolve "posts.subtitle_variants.window_30d" → string from JSON. */
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

function render(method: Parameters<typeof pickSubtitleKey>[0], count: number) {
  const picked = pickSubtitleKey(method, count);
  return {
    pt: interpolate(resolve(ptReport, picked.key), picked.params),
    en: interpolate(resolve(enReport, picked.key), picked.params),
  };
}

describe("pickSubtitleKey — posts.subtitle is method-safe", () => {
  it("window_30d → 'últimos 30 dias' / 'last 30 days'", () => {
    const { pt, en } = render("window_30d", 12);
    expect(pt).toBe("O contraste editorial dos últimos 30 dias.");
    expect(en).toBe("The editorial contrast over the last 30 days.");
  });

  it("window_90d → 'últimos 90 dias' / 'last 90 days'", () => {
    const { pt, en } = render("window_90d", 6);
    expect(pt).toBe("O contraste editorial dos últimos 90 dias.");
    expect(en).toBe("The editorial contrast over the last 90 days.");
  });

  it("sample_span count=8 → 'últimas 8 publicações' (sem '30 dias')", () => {
    const { pt, en } = render("sample_span", 8);
    expect(pt).toBe("O contraste editorial nas últimas 8 publicações.");
    expect(en).toBe("The editorial contrast across the latest 8 posts.");
    expect(pt).not.toMatch(/30 dias/);
    expect(en).not.toMatch(/30 days/);
  });

  it("sample_span count=1 → singular sem ortografia errada", () => {
    const { pt, en } = render("sample_span", 1);
    expect(pt).toBe("O contraste editorial na última publicação.");
    expect(en).toBe("The editorial contrast across the latest post.");
    // regressão: nunca "últimos 1 publicações"
    expect(pt).not.toMatch(/últim[ao]s 1\b/);
  });

  it("insufficient → fallback neutro 'amostra recolhida'", () => {
    const { pt, en } = render("insufficient", 0);
    expect(pt).toBe("O contraste editorial na amostra recolhida.");
    expect(en).toBe("The editorial contrast in the collected sample.");
    expect(pt).not.toMatch(/30 dias/);
  });

  it("undefined method (defensivo) → fallback neutro", () => {
    const { pt } = render(undefined, 0);
    expect(pt).toBe("O contraste editorial na amostra recolhida.");
  });

  it("nenhuma variante excepto window_30d contém '30 dias' (PT)", () => {
    const methods = ["window_90d", "sample_span", "insufficient"] as const;
    for (const m of methods) {
      const { pt, en } = render(m, 5);
      expect(pt, `pt-${m}`).not.toMatch(/30 dias/);
      expect(en, `en-${m}`).not.toMatch(/30 days/);
    }
  });
});