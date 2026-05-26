import { describe, it, expect } from "vitest";
import {
  computeExternalReading,
  type FormatEntry,
} from "../format-card";
import type { SocialinsiderInstagramContext } from "@/lib/knowledge/socialinsider-context";

const refs: SocialinsiderInstagramContext = {
  reel: {
    postsPerMonth: 6,
    engagementPct: 1.34,
    sourceName: "Socialinsider",
    sourceUrl: null,
    dataRange: { from: "2024-01-01", to: "2024-12-31" },
  },
  carousel: {
    postsPerMonth: 4,
    engagementPct: 1.1,
    sourceName: "Socialinsider",
    sourceUrl: null,
    dataRange: { from: "2024-01-01", to: "2024-12-31" },
  },
  image: {
    postsPerMonth: 3,
    engagementPct: 0.6,
    sourceName: "Socialinsider",
    sourceUrl: null,
    dataRange: { from: "2024-01-01", to: "2024-12-31" },
  },
};

describe("computeExternalReading", () => {
  it("returns 'absent' when this profile has zero of that format", () => {
    const formats: FormatEntry[] = [
      { format: "Carousels", sharePct: 100, count: 8 },
      { format: "Reels", sharePct: 0, count: 0 },
      { format: "Imagens", sharePct: 0, count: 0 },
    ];
    expect(computeExternalReading("Reels", refs, formats)).toBe("absent");
  });

  it("returns 'above' when profile share exceeds reference share by >10pp", () => {
    const formats: FormatEntry[] = [
      { format: "Carousels", sharePct: 80, count: 8 },
      { format: "Reels", sharePct: 10, count: 1 },
      { format: "Imagens", sharePct: 10, count: 1 },
    ];
    // Carousel ref share = 4/(4+6+3) = 30.7% → 80 - 30.7 > 10
    expect(computeExternalReading("Carousels", refs, formats)).toBe("above");
  });

  it("returns 'below' when profile share trails reference share by >10pp", () => {
    const formats: FormatEntry[] = [
      { format: "Carousels", sharePct: 80, count: 8 },
      { format: "Reels", sharePct: 10, count: 1 },
      { format: "Imagens", sharePct: 10, count: 1 },
    ];
    // Reel ref share = 6/13 = 46.1% → 10 - 46.1 < -10
    expect(computeExternalReading("Reels", refs, formats)).toBe("below");
  });

  it("returns 'near' when within ±10pp", () => {
    const formats: FormatEntry[] = [
      { format: "Carousels", sharePct: 31, count: 3 },
      { format: "Reels", sharePct: 46, count: 5 },
      { format: "Imagens", sharePct: 23, count: 2 },
    ];
    expect(computeExternalReading("Carousels", refs, formats)).toBe("near");
  });

  it("returns 'dash' when refs are missing entirely", () => {
    const formats: FormatEntry[] = [
      { format: "Carousels", sharePct: 50, count: 5 },
      { format: "Reels", sharePct: 50, count: 5 },
      { format: "Imagens", sharePct: 0, count: 0 },
    ];
    expect(computeExternalReading("Carousels", null, formats)).toBe("dash");
  });

  it("returns 'dash' for a format with no reference row", () => {
    const partial: SocialinsiderInstagramContext = {
      ...refs,
      image: null,
    };
    const formats: FormatEntry[] = [
      { format: "Carousels", sharePct: 50, count: 5 },
      { format: "Reels", sharePct: 30, count: 3 },
      { format: "Imagens", sharePct: 20, count: 2 },
    ];
    expect(computeExternalReading("Imagens", partial, formats)).toBe("dash");
  });

  it("never sums per-format frequencies into a total volume target", () => {
    // Sanity guard: the helper returns a directional enum, NOT a number.
    // This documents the design choice that Socialinsider postsPerMonth
    // values are never aggregated into a recommended monthly volume.
    const formats: FormatEntry[] = [
      { format: "Carousels", sharePct: 31, count: 3 },
      { format: "Reels", sharePct: 46, count: 5 },
      { format: "Imagens", sharePct: 23, count: 2 },
    ];
    const reading = computeExternalReading("Reels", refs, formats);
    expect(typeof reading).toBe("string");
    expect(["above", "below", "near", "absent", "dash"]).toContain(reading);
  });
});