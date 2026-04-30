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

import {
  BUFFER_TIER_TO_INTERNAL_TIER,
  getBenchmarkContextForProfile,
  normalizeDominantFormat,
} from "../benchmark-context";

describe("BUFFER_TIER_TO_INTERNAL_TIER", () => {
  it("mapeia todos os tiers Buffer para tiers internos válidos", () => {
    const internalValues = new Set(["nano", "micro", "mid", "macro"]);
    for (const v of Object.values(BUFFER_TIER_TO_INTERNAL_TIER)) {
      expect(internalValues.has(v)).toBe(true);
    }
  });
});

describe("normalizeDominantFormat", () => {
  it("normaliza variantes PT/EN", () => {
    expect(normalizeDominantFormat("Carrosséis")).toBe("carousel");
    expect(normalizeDominantFormat("Carousel")).toBe("carousel");
    expect(normalizeDominantFormat("Sidecar")).toBe("carousel");
    expect(normalizeDominantFormat("Reels")).toBe("reel");
    expect(normalizeDominantFormat("Imagens")).toBe("image");
    expect(normalizeDominantFormat(null)).toBe("unknown");
    expect(normalizeDominantFormat("")).toBe("unknown");
  });
});

describe("getBenchmarkContextForProfile", () => {
  it("monta contexto completo para perfil micro com Reels", () => {
    const ctx = getBenchmarkContextForProfile({
      followers: 7_500,
      dominantFormat: "reel",
    });
    expect(ctx.bufferTier?.tier).toBe("5-10K");
    expect(ctx.internalTier).toBe("micro");
    expect(ctx.socialinsiderForFormat?.format).toBe("reel");
    expect(ctx.hootsuite).toBeNull();
    expect(ctx.referenceReachPerPost).toBeNull(); // hasReachData=false (default)
    expect(ctx.copyHints.format).toContain("Reels");
  });

  it("expõe reach apenas com hasReachData=true", () => {
    const ctx = getBenchmarkContextForProfile({
      followers: 25_000,
      dominantFormat: "carousel",
      hasReachData: true,
    });
    expect(ctx.referenceReachPerPost).toBe(1172); // 10-50K tier
  });

  it("inclui hootsuite quando indústria fornecida", () => {
    const ctx = getBenchmarkContextForProfile({
      followers: 3_000,
      dominantFormat: "carousel",
      industry: "education",
    });
    expect(ctx.hootsuite?.industry).toBe("education");
    expect(ctx.hootsuite?.carouselEngagementRatePct).toBe(5.4);
  });

  it("formato unknown não tira o overall", () => {
    const ctx = getBenchmarkContextForProfile({
      followers: 500,
      dominantFormat: "unknown",
    });
    expect(ctx.socialinsiderOverall.format).toBe("overall");
    expect(ctx.socialinsiderForFormat).toBeNull();
    expect(ctx.copyHints.format).toBe("");
  });
});
