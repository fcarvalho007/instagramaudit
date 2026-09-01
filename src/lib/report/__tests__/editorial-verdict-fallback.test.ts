/**
 * Verifica que `buildFallbackVerdict` integra correctamente a nova
 * `FallbackQualifiers` (cadenceLabelPt + hashtagsState + topHashtags)
 * e mantém retrocompatibilidade com snapshots antigos sem estes campos.
 */

import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";

import { buildFallbackVerdict } from "../editorial-verdict-fallback";
import type { EditorialVerdictMetrics } from "../editorial-verdict";

/**
 * `t` stub determinístico: devolve a key. Suficiente para testar a
 * concatenação das frases qualificadoras sem depender do i18n real.
 */
const t: TFunction = ((key: string, opts?: { defaultValue?: string }) => {
  if (opts && typeof opts.defaultValue === "string") return opts.defaultValue;
  return key;
}) as unknown as TFunction;

function baseMetrics(): EditorialVerdictMetrics {
  return {
    postsPerWeek30d: 3,
    cadenceSufficient: true,
    cadenceReliability: "high",
    engagementPct: 1.5,
    benchmarkEngagementPct: 1.2,
    avgComments: 4,
    avgLikes: 200,
    competitorsCount: 3,
    postsAnalyzed: 12,
  };
}

describe("buildFallbackVerdict — qualifiers", () => {
  it("retrocompat: sem qualifiers, paragraph fica igual ao base", () => {
    const v = buildFallbackVerdict(baseMetrics(), t);
    expect(v.paragraph).not.toContain("Na amostra recente");
    expect(v.paragraph).not.toContain("Hashtags recorrentes");
    expect(v.paragraph).not.toContain("Sem hashtags");
    expect(v.paragraph).not.toContain("Uso pontual");
  });

  it("recurring: hashtags e cadência NÃO entram no paragraph", () => {
    const v = buildFallbackVerdict(baseMetrics(), t, {
      cadenceLabelPt: "cerca de 1 post a cada 2–3 dias",
      hashtagsState: "recurring",
      topHashtags: ["lifestyle", "porto", "viagens"],
    });
    expect(v.paragraph).not.toContain("cerca de 1 post a cada 2–3 dias");
    expect(v.paragraph).not.toMatch(/#\w+/);
  });

  it("weak: não acrescenta frase de uso pontual", () => {
    const v = buildFallbackVerdict(baseMetrics(), t, {
      hashtagsState: "weak",
      topHashtags: ["um", "dois"],
    });
    expect(v.paragraph).not.toContain("Uso pontual de hashtags");
    expect(v.paragraph).not.toMatch(/#\w+/);
  });

  it("absent: não acrescenta frase de ausência", () => {
    const v = buildFallbackVerdict(baseMetrics(), t, {
      hashtagsState: "absent",
    });
    expect(v.paragraph).not.toContain("Sem hashtags relevantes na amostra.");
  });

  it("cadenceMethod legado também não é colado ao paragraph", () => {
    const v = buildFallbackVerdict(baseMetrics(), t, {
      cadenceMethod: "window_30d",
      cadenceLabelPt: "cerca de 1 post por dia",
    });
    expect(v.paragraph).not.toContain("cerca de 1 post por dia");
    expect(v.paragraph).not.toContain("identity.fallback_cadence_qualifier");
  });

  it("hasRecurringHashtags legado não injecta texto", () => {
    const v = buildFallbackVerdict(baseMetrics(), t, {
      hasRecurringHashtags: false,
      hashtagsState: "recurring",
      topHashtags: ["lifestyle"],
    });
    expect(v.paragraph).not.toContain("identity.fallback_hashtags_absent");
    expect(v.paragraph).not.toMatch(/#\w+/);
  });

  it("não imprime percentagens", () => {
    const v = buildFallbackVerdict(baseMetrics(), t, {
      cadenceLabelPt: "cerca de 3 publicações por semana",
      hashtagsState: "recurring",
      topHashtags: ["lifestyle"],
    });
    expect(v.paragraph).not.toMatch(/\d+([.,]\d+)?\s*%/);
  });

  it("sem cadenceLabelPt nem cadenceMethod: paragraph não tenta inventar cadência", () => {
    const v = buildFallbackVerdict(baseMetrics(), t, {
      hashtagsState: "absent",
    });
    expect(v.paragraph).not.toContain("Na amostra recente, o perfil publica");
  });

  it("fallback é diagnóstico, não prescritivo (paragraph sem verbos imperativos)", () => {
    const v = buildFallbackVerdict(baseMetrics(), t, {
      cadenceLabelPt: "cerca de 1 post por dia",
      hashtagsState: "recurring",
      topHashtags: ["lifestyle"],
    });
    // Imperativos típicos que NÃO devem aparecer no diagnóstico.
    const prescriptive =
      /\b(deves|tens de|aposta|publica mais|usa mais|cria|evita|reduz|aumenta|começa|experimenta)\b/i;
    expect(v.paragraph).not.toMatch(prescriptive);
  });

  it("fallback não reutiliza marcadores do hero legacy mock", () => {
    const v = buildFallbackVerdict(baseMetrics(), t, {
      cadenceLabelPt: "cerca de 1 post por dia",
      hashtagsState: "recurring",
      topHashtags: ["lifestyle"],
    });
    // Hero mock antigo costumava conter "AI_INSIGHTS_MOCK" ou prefixos
    // genéricos como "Insight principal:". O fallback não deve depender
    // desse texto — confirma que não há leak.
  expect(v.paragraph).not.toMatch(/AI_INSIGHTS_MOCK/i);
  expect(v.paragraph).not.toMatch(/Insight principal:/i);
  });
});