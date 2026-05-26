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

  it("recurring: cita até 2 hashtags com prefixo `#`", () => {
    const v = buildFallbackVerdict(baseMetrics(), t, {
      cadenceLabelPt: "cerca de 1 post a cada 2–3 dias",
      hashtagsState: "recurring",
      topHashtags: ["lifestyle", "porto", "viagens"],
    });
    expect(v.paragraph).toContain(
      "Na amostra recente, o perfil publica cerca de 1 post a cada 2–3 dias.",
    );
    expect(v.paragraph).toContain("Hashtags recorrentes na amostra: #lifestyle, #porto.");
    // Não cita a terceira tag.
    expect(v.paragraph).not.toContain("#viagens");
  });

  it("weak: emite frase de uso pontual sem citar tags", () => {
    const v = buildFallbackVerdict(baseMetrics(), t, {
      hashtagsState: "weak",
      topHashtags: ["um", "dois"],
    });
    expect(v.paragraph).toContain("Uso pontual de hashtags, sem assinatura clara.");
    expect(v.paragraph).not.toMatch(/#\w+/);
  });

  it("absent: emite frase de ausência", () => {
    const v = buildFallbackVerdict(baseMetrics(), t, {
      hashtagsState: "absent",
    });
    expect(v.paragraph).toContain("Sem hashtags relevantes na amostra.");
  });

  it("cadenceLabelPt tem prioridade sobre cadenceMethod", () => {
    const v = buildFallbackVerdict(baseMetrics(), t, {
      cadenceMethod: "window_30d",
      cadenceLabelPt: "cerca de 1 post por dia",
    });
    expect(v.paragraph).toContain("cerca de 1 post por dia");
    // Não dispara também o fallback baseado em cadenceMethod (`identity.fallback_cadence_qualifier.window_30d`).
    expect(v.paragraph).not.toContain("identity.fallback_cadence_qualifier");
  });

  it("hashtagsState tem prioridade sobre hasRecurringHashtags", () => {
    const v = buildFallbackVerdict(baseMetrics(), t, {
      hasRecurringHashtags: false,
      hashtagsState: "recurring",
      topHashtags: ["lifestyle"],
    });
    expect(v.paragraph).toContain("Hashtags recorrentes na amostra: #lifestyle.");
    // Não cai no caminho legado i18n.
    expect(v.paragraph).not.toContain("identity.fallback_hashtags_absent");
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
    expect(v.paragraph).toContain("Sem hashtags relevantes na amostra.");
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