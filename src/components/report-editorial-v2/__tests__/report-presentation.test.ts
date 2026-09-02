import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { parseReportDesign } from "../report-presentation-props";
import { ObservationBlock } from "../primitives/observation-block";
import { ReadingBlock } from "../primitives/reading-block";
import { StatusPill } from "../primitives/status-pill";

vi.mock("@/components/report-redesign/v2/report-shell-v2", () => ({
  ReportShellV2: (props: Record<string, unknown>) =>
    createElement("div", {
      "data-shell": "production",
      "data-props": Object.keys(props).sort().join(","),
    }),
}));

vi.mock("../editorial-v2-shell", () => ({
  EditorialV2Shell: (props: Record<string, unknown>) =>
    createElement("div", {
      "data-shell": "editorial_v2",
      "data-props": Object.keys(props).sort().join(","),
    }),
}));

const { ReportPresentation } = await import("../report-presentation");

const baseProps = {
  result: {} as never,
  snapshotId: "snap-1",
  actions: {},
  leadCaptured: false,
  premiumUnlocked: false,
};

describe("parseReportDesign", () => {
  it("only accepts editorial_v2", () => {
    expect(parseReportDesign("editorial_v2")).toBe("editorial_v2");
    expect(parseReportDesign("nope")).toBeUndefined();
    expect(parseReportDesign(undefined)).toBeUndefined();
  });
});

describe("ReportPresentation switch", () => {
  it("renders the production report by default", () => {
    const html = renderToStaticMarkup(createElement(ReportPresentation, baseProps));
    expect(html).toContain('data-shell="production"');
    expect(html).not.toContain('data-shell="editorial_v2"');
  });

  it("renders Editorial V2 only when explicitly requested", () => {
    const html = renderToStaticMarkup(
      createElement(ReportPresentation, { ...baseProps, design: "editorial_v2" as const }),
    );
    expect(html).toContain('data-shell="editorial_v2"');
    expect(html).not.toContain('data-shell="production"');
  });

  it("passes the same production props to both variants and never leaks `design`", () => {
    const production = renderToStaticMarkup(createElement(ReportPresentation, baseProps));
    const editorial = renderToStaticMarkup(
      createElement(ReportPresentation, { ...baseProps, design: "editorial_v2" as const }),
    );
    const keys = (html: string) => /data-props="([^"]*)"/.exec(html)?.[1];

    expect(keys(editorial)).toBe(keys(production));
    expect(keys(production)).not.toContain("design");
  });
});

describe("Observation vs Reading primitives", () => {
  it("labels observation and reading distinctly", () => {
    const observation = renderToStaticMarkup(
      createElement(ObservationBlock, { statements: ["36 publicações analisadas."] }),
    );
    const reading = renderToStaticMarkup(
      createElement(ReadingBlock, {
        hypothesis: "Os dados sugerem menor alcance.",
        confidence: "média" as const,
      }),
    );

    expect(observation).toContain("Observação");
    expect(observation).not.toContain("Leitura");
    expect(reading).toContain("Leitura");
    expect(reading).toContain("Os dados sugerem");
  });

  it("StatusPill conveys meaning with text, not colour alone", () => {
    const html = renderToStaticMarkup(
      createElement(StatusPill, { tone: "danger" as const, label: "Abaixo do escalão" }),
    );
    expect(html).toContain("Abaixo do escalão");
    expect(html).toContain("svg");
  });
});
