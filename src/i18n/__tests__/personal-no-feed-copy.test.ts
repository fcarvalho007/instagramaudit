import { describe, expect, it } from "vitest";

import ptErrors from "@/i18n/locales/pt/errors.json";
import enErrors from "@/i18n/locales/en/errors.json";
import ptAnalyze from "@/i18n/locales/pt/analyze.json";
import enAnalyze from "@/i18n/locales/en/analyze.json";

describe("i18n · PROFILE_PERSONAL_NO_FEED copy", () => {
  it("PT/EN têm entrada PROFILE_PERSONAL_NO_FEED em errors.json", () => {
    expect((ptErrors as unknown as Record<string, string>).PROFILE_PERSONAL_NO_FEED).toMatch(/perfil/i);
    expect((enErrors as unknown as Record<string, string>).PROFILE_PERSONAL_NO_FEED).toMatch(/profile/i);
  });

  it("PT/EN têm error.personalNoFeed.title e .cta em analyze.json", () => {
    const pt = ptAnalyze as { error: { personalNoFeed: { title: string; cta: string } } };
    const en = enAnalyze as { error: { personalNoFeed: { title: string; cta: string } } };
    expect(pt.error.personalNoFeed.title).toBe("Não foi possível analisar este perfil");
    expect(pt.error.personalNoFeed.cta).toBe("Analisar outro perfil");
    expect(en.error.personalNoFeed.title).toBe("We couldn't analyze this profile");
    expect(en.error.personalNoFeed.cta).toBe("Analyze another profile");
  });

  it("Copy PT usa pt-PT (sem brasileirismos óbvios)", () => {
    const msg = (ptErrors as unknown as Record<string, string>).PROFILE_PERSONAL_NO_FEED;
    expect(msg).not.toMatch(/\busuário\b/i);
    expect(msg).not.toMatch(/\btela\b/i);
    expect(msg).not.toMatch(/\bcelular\b/i);
    expect(msg).not.toMatch(/\bvocê\b/i);
  });

  it("Copy PT é não-acusatória (não pede ao dono para mudar)", () => {
    const msg = (ptErrors as unknown as Record<string, string>).PROFILE_PERSONAL_NO_FEED;
    expect(msg).not.toMatch(/pede ao dono/i);
    expect(msg).not.toMatch(/pedir ao dono/i);
  });
});

describe("i18n · AnalysisErrorState consome chaves novas", () => {
  it("o componente referencia as chaves personalNoFeed.title e personalNoFeed.cta", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      "src/components/product/analysis-error-state.tsx",
      "utf8",
    );
    expect(src).toContain('error.personalNoFeed.title');
    expect(src).toContain('error.personalNoFeed.cta');
    // Garante que o retry continua escondido para este código.
    expect(src).toContain('PROFILE_PERSONAL_NO_FEED');
    expect(src).toMatch(/!isPersonalNoFeed/);
  });
});