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

  it("cada fonte tem url, ano e descrição editorial", () => {
    for (const s of INSTAGRAM_BENCHMARK_CONTEXT.sources) {
      expect(s.url).toMatch(/^https:\/\//);
      expect(s.publishedYear).toBeGreaterThanOrEqual(2024);
      expect(s.shortDescription.length).toBeGreaterThan(10);
      expect(s.shortDescription.length).toBeLessThanOrEqual(120);
      expect(["high", "medium", "low"]).toContain(s.referenceQuality);
    }
  });

  it("Socialinsider e Buffer têm qualidade alta; Databox baixa", () => {
    const map = Object.fromEntries(
      INSTAGRAM_BENCHMARK_CONTEXT.sources.map((s) => [s.name, s.referenceQuality]),
    );
    expect(map["Socialinsider"]).toBe("high");
    expect(map["Buffer"]).toBe("high");
    expect(map["Databox"]).toBe("low");
  });

  it("Socialinsider/Buffer/Hootsuite são activas; Databox futura", () => {
    const visibility = Object.fromEntries(
      INSTAGRAM_BENCHMARK_CONTEXT.sources.map((s) => [s.name, s.visibility]),
    );
    expect(visibility["Socialinsider"]).toBe("active");
    expect(visibility["Buffer"]).toBe("active");
    expect(visibility["Hootsuite"]).toBe("active");
    expect(visibility["Databox"]).toBe("future");

    const active = INSTAGRAM_BENCHMARK_CONTEXT.sources
      .filter((s) => s.visibility === "active")
      .map((s) => s.name)
      .sort();
    expect(active).toEqual(["Buffer", "Hootsuite", "Socialinsider"]);
  });

  it("sourceNote visível não contém Databox", () => {
    const note = INSTAGRAM_BENCHMARK_CONTEXT.visibleCopyRulesPt.sourceNote;
    expect(note).not.toContain("Databox");
    expect(note).toContain("Socialinsider");
    expect(note).toContain("Buffer");
    expect(note).toContain("Hootsuite");
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
    expect(getBufferTierForFollowers(999_999)?.tier).toBe("500K-1M");
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
import {
  BENCHMARK_DATASET_VERSION,
  formatBenchmarkContextForPrompt,
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

  it("perfis ≥1M caem em fallback macro com tierNote", () => {
    const ctx = getBenchmarkContextForProfile({
      followers: 1_200_000,
      dominantFormat: "carousel",
    });
    expect(ctx.bufferTier).toBeNull();
    expect(ctx.internalTier).toBe("macro");
    expect(ctx.copyHints.tierNote).toContain("acima dos escalões");
    expect(ctx.referenceReachPerPost).toBeNull();
  });

  it("fronteira exacta: 1 000 000 → bufferTier null + aboveBufferRangeHint", () => {
    const ctx = getBenchmarkContextForProfile({
      followers: 1_000_000,
      dominantFormat: "carousel",
    });
    expect(ctx.bufferTier).toBeNull();
    expect(ctx.internalTier).toBe("macro");
    expect(ctx.copyHints.tierNote).toBe(
      INSTAGRAM_BENCHMARK_CONTEXT.visibleCopyRulesPt.aboveBufferRangeHint,
    );
  });

  it("fronteira exacta: 999 999 → tier 500K-1M sem hint", () => {
    const ctx = getBenchmarkContextForProfile({
      followers: 999_999,
      dominantFormat: "carousel",
    });
    expect(ctx.bufferTier?.tier).toBe("500K-1M");
    expect(ctx.copyHints.tierNote).toBe("");
  });

  it("followers=0 mantém-se dentro do tier 0-1K e sem tierNote", () => {
    const ctx = getBenchmarkContextForProfile({
      followers: 0,
      dominantFormat: "image",
    });
    expect(ctx.bufferTier?.tier).toBe("0-1K");
    expect(ctx.internalTier).toBe("nano");
    expect(ctx.copyHints.tierNote).toBe("");
  });
});

describe("BENCHMARK_DATASET_VERSION", () => {
  it("é uma string ISO yyyy-mm-dd", () => {
    expect(BENCHMARK_DATASET_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("formatBenchmarkContextForPrompt", () => {
  it("inclui tier Buffer, ER por formato e formato dominante para perfil micro com Reels", () => {
    const out = formatBenchmarkContextForPrompt({
      followers: 7_500,
      dominantFormat: "reel",
    });
    expect(out).toContain("REFERÊNCIAS DIRECIONAIS");
    expect(out).toContain("5-10K");
    expect(out).toContain("3.90%"); // ER mediana 5-10K
    expect(out).toContain("0.52%"); // ER reel
    expect(out).toContain("Formato dominante do perfil: reel");
    expect(out).toContain("Indústria: n/a");
  });

  it("perfis ≥1M usam linha de marcador específica e omitem tier Buffer", () => {
    const out = formatBenchmarkContextForPrompt({
      followers: 2_500_000,
      dominantFormat: "carousel",
    });
    expect(out).toContain("≥1M");
    expect(out).not.toContain("500K-1M ·"); // sem despejar a linha do tier directamente
  });

  it("inclui linha de indústria quando fornecida", () => {
    const out = formatBenchmarkContextForPrompt({
      followers: 30_000,
      dominantFormat: "carousel",
      industry: "education",
    });
    expect(out).toContain("Indústria");
    expect(out).toContain("5.40%"); // education carousel ER
  });

  it("não revela valores de alcance/reach quando hasReachData=false (default)", () => {
    const out = formatBenchmarkContextForPrompt({
      followers: 25_000,
      dominantFormat: "carousel",
    });
    // O princípio editorial fixo contém "não apenas alcance" — isso é
    // aceitável. O que não pode aparecer é o número do tier nem a label
    // específica "alcance mediano ref.:".
    expect(out).not.toContain("alcance mediano ref.:");
    expect(out).not.toContain("1172"); // medianReachPerPost do tier 10-50K
  });

  it("inclui alcance quando hasReachData=true", () => {
    const out = formatBenchmarkContextForPrompt({
      followers: 25_000,
      dominantFormat: "carousel",
      hasReachData: true,
    });
    expect(out.toLowerCase()).toContain("alcance");
    expect(out).toContain("1172"); // medianReachPerPost do tier 10-50K
  });

  it("nunca menciona marcas das fontes editoriais", () => {
    const out = formatBenchmarkContextForPrompt({
      followers: 50_000,
      dominantFormat: "reel",
      industry: "technology",
      hasReachData: true,
    });
    for (const brand of ["Socialinsider", "Buffer", "Hootsuite", "Databox"]) {
      expect(out).not.toContain(brand);
    }
  });
});
