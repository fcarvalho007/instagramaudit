import { describe, it, expect, vi, afterEach } from "vitest";
import { compatibleMethodology, PUBLIC_ENGAGEMENT_METHOD } from "@/lib/benchmark/methodology";
import { signPrintToken, verifyPrintToken } from "@/lib/pdf/print-token.server";
import { isAnalysisSettled } from "@/lib/report-snapshots/frozen-analysis";
import { canonicalFixture } from "./fixtures";
import { enrichPosts, computeContentSummary } from "@/lib/analysis/normalize";
import { buildComparisonEvidence } from "../build-evidence";
afterEach(() => vi.unstubAllEnvs());
describe("methodology and access", () => {
  const reference = {
    ...PUBLIC_ENGAGEMENT_METHOD,
    source: "https://example.org/methodology",
    published_at: "2026-09-10",
  };
  it("requires complete matching provenance and formula", () => {
    expect(compatibleMethodology(reference)).toBe(true);
    expect(compatibleMethodology(undefined)).toBe(false);
    for (const field of ["numerator", "denominator", "aggregation", "population", "format_scope"])
      expect(compatibleMethodology({ ...reference, [field]: "different" })).toBe(false);
    expect(compatibleMethodology({ ...reference, source: "" })).toBe(false);
  });
  it("distinguishes absent metrics from observed zero after normalization", () => {
    const p = canonicalFixture();
    const raw = [{ id: "absent", timestamp: "2026-09-09" }];
    const normalized = {
      ...p,
      content_summary: computeContentSummary(raw, 1000),
      ...enrichPosts(raw, 1000),
    };
    expect(buildComparisonEvidence(normalized)?.primary.engagement_rate_pct).toBeNull();
    const zero = [{ ...raw[0], likesCount: 0, commentsCount: 0 }];
    expect(
      buildComparisonEvidence({
        ...p,
        content_summary: computeContentSummary(zero, 1000),
        ...enrichPosts(zero, 1000),
      })?.primary.engagement_rate_pct,
    ).toBe(0);
  });
  it("binds print access to one snapshot and expiration", () => {
    vi.stubEnv("PDF_PRINT_SIGNING_SECRET", "test-only-secret");
    const now = Date.now();
    const token = signPrintToken("a", "pro", now);
    expect(verifyPrintToken("a", token, now)).toBe("pro");
    expect(verifyPrintToken("b", token, now)).toBeNull();
    expect(verifyPrintToken("a", token, now + 601000)).toBeNull();
    expect(verifyPrintToken("a", token.replace("pro", "free"), now)).toBeNull();
  });
  it("freezes only settled analysis without losing partial terminal results", () => {
    expect(isAnalysisSettled({ enrichment_status: { comparison_readings: "pending" } })).toBe(
      false,
    );
    expect(
      isAnalysisSettled({
        enrichment_status: { comparison_readings: "error", visual_cover: "success" },
      }),
    ).toBe(true);
  });
});
