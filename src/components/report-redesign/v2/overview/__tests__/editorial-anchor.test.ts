import { describe, it, expect } from "vitest";
import {
  selectAnchor,
  selectWhy,
} from "../editorial-identity-card";

// Mock TFunction: returns the key with interpolation appended, deterministic.
const t = ((key: string, vars?: Record<string, unknown>) =>
  vars ? `${key}{${JSON.stringify(vars)}}` : key) as unknown as Parameters<
  typeof selectAnchor
>[3];

describe("selectAnchor", () => {
  it("prefers engagement when |delta| >= 10 and benchmark > 0", () => {
    const r = selectAnchor(
      { engagementRate: 4, engagementBenchmark: 3, engagementDeltaPct: 33 },
      10,
      5,
      t,
      "pt",
    );
    expect(r.kind).toBe("engagement");
    expect(r.value).toBe("+33%");
    expect(r.sentence).toContain("identity.anchor.engagement_above");
  });

  it("uses engagement_below for negative delta", () => {
    const r = selectAnchor(
      { engagementRate: 1, engagementBenchmark: 3, engagementDeltaPct: -45 },
      0,
      0,
      t,
      "pt",
    );
    expect(r.kind).toBe("engagement");
    expect(r.value).toBe("-45%");
    expect(r.sentence).toContain("engagement_below");
  });

  it("falls back to comments when delta < 10 and avgComments >= 1", () => {
    const r = selectAnchor(
      { engagementRate: 3, engagementBenchmark: 3, engagementDeltaPct: 2 },
      4.2,
      5,
      t,
      "pt",
    );
    expect(r.kind).toBe("comments");
    expect(r.value).toBe("4,2");
    expect(r.caption).toBe("identity.anchor.comments_caption");
  });

  it("uses dot decimal separator for en locale", () => {
    const r = selectAnchor(undefined, 4.2, undefined, t, "en");
    expect(r.kind).toBe("comments");
    expect(r.value).toBe("4.2");
  });

  it("falls back to rhythm when no engagement and no comments", () => {
    const r = selectAnchor(undefined, 0, 3.5, t, "pt");
    expect(r.kind).toBe("rhythm");
    expect(r.value).toBe("3,5");
  });

  it("returns null kind when nothing qualifies", () => {
    const r = selectAnchor(undefined, 0, 0.2, t, "pt");
    expect(r.kind).toBeNull();
  });
});

describe("selectWhy", () => {
  it("weak_cadence overrides everything when freq < 1", () => {
    expect(
      selectWhy("solid", { engagementRate: 5, engagementBenchmark: 3, engagementDeltaPct: 50 }, 0.5, 30),
    ).toBe("weak_cadence");
  });

  it("warning_below when band=warning and delta <= -30", () => {
    expect(
      selectWhy("warning", { engagementRate: 1, engagementBenchmark: 3, engagementDeltaPct: -40 }, 3, 50),
    ).toBe("warning_below");
  });

  it("solid_above when band=solid and delta >= 10", () => {
    expect(
      selectWhy("solid", { engagementRate: 4, engagementBenchmark: 3, engagementDeltaPct: 30 }, 3, 50),
    ).toBe("solid_above");
  });

  it("format_concentrated when share >= 70 and no stronger signal", () => {
    expect(selectWhy("developing", undefined, 3, 80)).toBe("format_concentrated");
  });

  it("developing when band=developing and no other rule fires", () => {
    expect(selectWhy("developing", undefined, 3, 50)).toBe("developing");
  });

  it("neutral as final fallback", () => {
    expect(selectWhy("warning", undefined, 3, 50)).toBe("neutral");
  });
});