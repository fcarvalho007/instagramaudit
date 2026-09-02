import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { parseReportDesign } from "../report-presentation-props";
import { ObservationBlock } from "../primitives/observation-block";
import { ReadingBlock } from "../primitives/reading-block";
import { StatusPill } from "../primitives/status-pill";

vi.mock("@/components/report-redesign/v2/report-shell-v2", () => ({
  ReportShellV2: (props: Record<string, unknown>) => (
    <div data-testid="production-shell" data-props={Object.keys(props).sort().join(",")} />
  ),
}));

vi.mock("../editorial-v2-shell", () => ({
  EditorialV2Shell: (props: Record<string, unknown>) => (
    <div data-testid="editorial-v2-shell" data-props={Object.keys(props).sort().join(",")} />
  ),
}));

// Import after mocks so the switch picks them up.
const { ReportPresentation } = await import("../report-presentation");

const baseProps = {
  result: {} as never,
  snapshotId: "snap-1",
  actions: {},
  leadCaptured: false,
  premiumUnlocked: false,
} as const;

describe("parseReportDesign", () => {
  it("only accepts editorial_v2", () => {
    expect(parseReportDesign("editorial_v2")).toBe("editorial_v2");
    expect(parseReportDesign("something-else")).toBeUndefined();
    expect(parseReportDesign(undefined)).toBeUndefined();
  });
});

describe("ReportPresentation switch", () => {
  it("renders the production report by default", () => {
    render(<ReportPresentation {...baseProps} />);
    expect(screen.getByTestId("production-shell")).toBeTruthy();
    expect(screen.queryByTestId("editorial-v2-shell")).toBeNull();
  });

  it("renders Editorial V2 when explicitly requested", () => {
    render(<ReportPresentation {...baseProps} design="editorial_v2" />);
    expect(screen.getByTestId("editorial-v2-shell")).toBeTruthy();
    expect(screen.queryByTestId("production-shell")).toBeNull();
  });

  it("passes the same production props to both variants", () => {
    const { unmount } = render(<ReportPresentation {...baseProps} />);
    const productionKeys = screen.getByTestId("production-shell").getAttribute("data-props");
    unmount();

    render(<ReportPresentation {...baseProps} design="editorial_v2" />);
    const editorialKeys = screen.getByTestId("editorial-v2-shell").getAttribute("data-props");

    expect(editorialKeys).toBe(productionKeys);
    expect(productionKeys).not.toContain("design");
  });
});

describe("Observation vs Reading primitives", () => {
  it("labels observation and reading distinctly", () => {
    render(
      <>
        <ObservationBlock statements={["36 publicações analisadas."]} />
        <ReadingBlock hypothesis="Os dados sugerem menor alcance." confidence="média" />
      </>,
    );
    expect(screen.getByText("Observação")).toBeTruthy();
    expect(screen.getByText("Leitura")).toBeTruthy();
  });

  it("StatusPill conveys meaning with text, not colour alone", () => {
    render(<StatusPill tone="danger" label="Abaixo do escalão" />);
    expect(screen.getByText("Abaixo do escalão")).toBeTruthy();
  });
});
