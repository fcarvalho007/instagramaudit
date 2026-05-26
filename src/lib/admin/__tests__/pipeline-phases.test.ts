import { describe, it, expect } from "vitest";
import {
  buildPipelineSummary,
  type PipelineRequestInput,
  type PipelineSnapshotInput,
} from "../pipeline-phases";

function snap(id: string, created_at = "2026-01-01T00:00:00Z"): PipelineSnapshotInput {
  return { id, created_at };
}

function req(
  partial: Partial<PipelineRequestInput> = {},
): PipelineRequestInput {
  return {
    request_status: "pending",
    pdf_status: "not_generated",
    delivery_status: "not_sent",
    email_sent_at: null,
    ...partial,
  };
}

describe("buildPipelineSummary · invariante cumulativa", () => {
  it("snapshot ≥ email_submitted ≥ pdf ≥ email", () => {
    const snaps = [snap("a"), snap("b"), snap("c"), snap("d"), snap("e")];
    const map = new Map<string, PipelineRequestInput>([
      ["a", req()],
      ["b", req({ pdf_status: "generated" })],
      ["c", req({ pdf_status: "generated", delivery_status: "sent", email_sent_at: "2026-01-01T00:05:00Z" })],
      // d sem request, e com failure
      ["e", req({ pdf_status: "failed" })],
    ]);

    const { phases, failures_to_recover, total } = buildPipelineSummary(snaps, map);
    expect(total).toBe(5);
    expect(failures_to_recover).toBe(1);
    expect(phases.snapshot).toBe(5);
    expect(phases.email_submitted).toBe(3); // a, b, c (e failed exclui)
    expect(phases.pdf).toBe(2); // b, c
    expect(phases.email).toBe(1); // c
    // Invariante
    expect(phases.snapshot).toBeGreaterThanOrEqual(phases.email_submitted);
    expect(phases.email_submitted).toBeGreaterThanOrEqual(phases.pdf);
    expect(phases.pdf).toBeGreaterThanOrEqual(phases.email);
  });

  it("janela vazia", () => {
    const out = buildPipelineSummary([], new Map());
    expect(out.total).toBe(0);
    expect(out.phases).toEqual({ snapshot: 0, email_submitted: 0, pdf: 0, email: 0 });
  });
});