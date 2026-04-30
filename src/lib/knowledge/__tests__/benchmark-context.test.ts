import { describe, it, expect } from "vitest";
import {
  INSTAGRAM_BENCHMARK_CONTEXT,
  getBufferTierForFollowers,
  getSocialinsiderEngagementForFormat,
  getHootsuiteBenchmarkForIndustry,
} from "../benchmark-context";

describe("benchmark-context · invariantes", () => {
  it("nenhuma fonte permite links no relatório", () => {
    for (const s of INSTAGRAM_BENCHMARK_CONTEXT.sources) {
      expect(s.linksAllowedInReport).toBe(false);
    }
  });

  it("tem as quatro fontes aprovadas", () => {
    const names = INSTAGRAM_BENCHMARK_CONTEXT.sources.map((s) => s.name).sort();
    expect(names).toEqual(["Buffer", "Databox", "Hootsuite", "Socialinsider"]);
  });

  it("buffer tiers cobrem 0 até 1M sem sobreposição", () => {
    const tiers = INSTAGRAM_BENCHMARK_CONTEXT.bufferFollowerTiers;
    expect(tiers[0]!.minFollowers).toBe(0);
    expect(tiers[tiers.length - 1]!.maxFollowers).toBe(1_000_000);
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i]!.minFollowers).toBe(tiers[i - 1]!.maxFollowers);
    }
  });
});

describe("getBufferTierForFollowers", () => {
  it("mapeia escalões correctos", () => {
    expect(getBufferTierForFollowers(500)?.tier).toBe("0-1K");
    expect(getBufferTierForFollowers(2_500)?.tier).toBe("1-5K");
    expect(getBufferTierForFollowers(50_000)?.tier).toBe("50-100K");
    expect(getBufferTierForFollowers(750_000)?.tier).toBe("500K-1M");
  });

  it("devolve null para 1M+ ou inválidos", () => {
    expect(getBufferTierForFollowers(1_000_000)).toBeNull();
    expect(getBufferTierForFollowers(-1)).toBeNull();
    expect(getBufferTierForFollowers(Number.NaN)).toBeNull();
  });
});

describe("getSocialinsiderEngagementForFormat", () => {
  it("devolve referências por formato", () => {
    expect(getSocialinsiderEngagementForFormat("carousel")?.engagementRatePct).toBe(0.55);
    expect(getSocialinsiderEngagementForFormat("reel")?.engagementRatePct).toBe(0.52);
    expect(getSocialinsiderEngagementForFormat("image")?.engagementRatePct).toBe(0.37);
  });
});

describe("getHootsuiteBenchmarkForIndustry", () => {
  it("devolve null sem indústria", () => {
    expect(getHootsuiteBenchmarkForIndustry(null)).toBeNull();
    expect(getHootsuiteBenchmarkForIndustry(undefined)).toBeNull();
  });
  it("devolve benchmark para indústria conhecida", () => {
    const e = getHootsuiteBenchmarkForIndustry("education");
    expect(e?.carouselEngagementRatePct).toBe(5.4);
  });
});
