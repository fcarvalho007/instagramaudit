import { describe, it, expect, vi } from "vitest";
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { canonicalFixture } from "./fixtures";
import { ObservedIndicators } from "@/components/report-redesign/v2/overview/observed-indicators";
import {
  ComparisonReportProvider,
  ComparisonSelector,
  ComparisonExperiments,
} from "@/components/report-redesign/v2/leitura-ia/comparison-report-context";
import { ComparisonPrint } from "@/components/report-redesign/v2/leitura-ia/comparison-print";
import { buildProfileExperiments } from "../profile-experiments";
import { buildCoverage, windowBounds } from "../coverage";
import { writeFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
vi.mock("@/lib/tracking.functions", () => ({ trackEvent: vi.fn().mockResolvedValue({}) }));
describe("paid report presentation", () => {
  it("renders optional context-free evidence and proposed parameters without a global score", () => {
    const raw = canonicalFixture();
    const payload = {
      ...raw,
      analysis_window: "30d" as const,
      comparison_version: 2,
      competitors: [],
      collection_coverage: buildCoverage(
        raw.posts,
        windowBounds("30d", Date.parse(raw.analysis_window_end)),
        100,
        false,
      ),
      profile_experiments_v2: buildProfileExperiments(raw),
    };
    const html = renderToStaticMarkup(
      h(
        "main",
        {},
        h(ObservedIndicators, { payload }),
        h(ComparisonReportProvider, { payload, enabled: true, children: h(ComparisonExperiments) }),
        h(ComparisonPrint, { payload }),
      ),
    );
    expect(html).toContain("Indicadores observados");
    expect(html).toContain("Parâmetros propostos");
    expect(html).toContain("Abrir publicação");
    expect(html).not.toContain("/ 100");
    expect(html).not.toContain("javascript:");
    if (process.env.COMPARISON_RENDER_REVIEW === "1") {
      const assets = resolve(".output/public/assets");
      const css = readdirSync(assets)
        .filter((f) => f.endsWith(".css"))
        .map((f) => readFileSync(resolve(assets, f), "utf8"))
        .join("\n");
      mkdirSync(resolve("../qa"), { recursive: true });
      writeFileSync(
        resolve("../qa/comparison.html"),
        `<!doctype html><html lang="pt"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style><body data-theme="light" data-report-view="true"><div style="max-width:1050px;margin:40px auto;padding:24px"><p style="margin-bottom:24px">Pré-visualização de teste · dados sintéticos</p>${html}</div><script>document.querySelectorAll('details').forEach(e=>e.open=true)</script></body></html>`,
      );
    }
  });
  it("shows both manual choices and never claims a pending reading is ready", () => {
    const html = renderToStaticMarkup(
      h(ComparisonReportProvider, {
        payload: { ...canonicalFixture(), comparison_version: 2 },
        enabled: true,
        children: h(ComparisonSelector),
      }),
    );
    expect(html).toContain("@beta");
    expect(html).toContain("@gamma");
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("ainda não está disponível");
  });
  it("does not render paid experiments for a free viewer", () => {
    const p = {
      ...canonicalFixture(),
      comparison_version: 2,
      profile_experiments_v2: buildProfileExperiments(canonicalFixture()),
    };
    expect(
      renderToStaticMarkup(
        h(ComparisonReportProvider, {
          payload: p,
          enabled: false,
          children: h(ComparisonExperiments),
        }),
      ),
    ).toBe("");
  });
});
