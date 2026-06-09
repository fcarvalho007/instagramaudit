import { describe, it, expect } from "vitest";
import { getEffectiveFeatures } from "../effective-features";
import { getVariantFeatures } from "../report-variant";

const LAB_KEYS = [
  "blockPerformance",
  "blockContent",
  "blockSearch",
  "blockBenchmark",
] as const;

describe("lab-only blocks (03–06) visibility floor", () => {
  it("public_mvp static defaults keep all lab blocks hidden", () => {
    const f = getVariantFeatures("public_mvp");
    for (const k of LAB_KEYS) expect(f[k]).toBe("hidden");
  });

  it("pro_preview static defaults keep all lab blocks hidden", () => {
    const f = getVariantFeatures("pro_preview");
    for (const k of LAB_KEYS) expect(f[k]).toBe("hidden");
  });

  it("internal_lab static defaults expose all lab blocks", () => {
    const f = getVariantFeatures("internal_lab");
    for (const k of LAB_KEYS) expect(f[k]).toBe("full");
  });

  it("public_mvp override that tries to expose lab blocks is clamped to hidden", () => {
    const defaults = getVariantFeatures("public_mvp");
    const override = {
      blockPerformance: "full",
      blockContent: "full",
      blockSearch: "full",
      blockBenchmark: "full",
    } as const;
    const eff = getEffectiveFeatures("public_mvp", defaults, override);
    for (const k of LAB_KEYS) expect(eff[k]).toBe("hidden");
  });

  it("pro_preview override that tries to expose lab blocks is clamped to hidden", () => {
    const defaults = getVariantFeatures("pro_preview");
    const override = {
      blockPerformance: "full",
      blockContent: "full",
      blockSearch: "full",
      blockBenchmark: "full",
    } as const;
    const eff = getEffectiveFeatures("pro_preview", defaults, override);
    for (const k of LAB_KEYS) expect(eff[k]).toBe("hidden");
  });

  it("internal_lab respects overrides (lab can hide its own blocks)", () => {
    const defaults = getVariantFeatures("internal_lab");
    const override = { blockPerformance: "hidden" } as const;
    const eff = getEffectiveFeatures("internal_lab", defaults, override);
    expect(eff.blockPerformance).toBe("hidden");
    expect(eff.blockContent).toBe("full");
  });
});