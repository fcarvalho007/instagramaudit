import { describe, expect, it } from "vitest";

import {
  deriveEditorialVerdict,
  detectVerdictContradictions,
  type EditorialVerdictMetrics,
} from "../editorial-verdict";
import type { EditorialVerdict } from "@/lib/insights/types";

/** Cria um veredicto IA "limpo" e deixa o teste ajustar campos. */
function makeAi(overrides: Partial<EditorialVerdict> = {}): EditorialVerdict {
  return {
    verdict_label: "promising",
    title: "Sinal editorial em construção",
    paragraph:
      "O perfil mostra envolvimento de 1,2% e cadência regular ao longo das últimas 4 semanas, com base sólida no formato dominante.",
    priority: "Reforçar a clareza editorial das próximas 8 publicações.",
    strengths: ["Cadência regular nas últimas semanas", "Audiência fiel"] as readonly [
      string,
      string,
    ],
    limitations: [
      "Conversa por desenvolver nos comentários",
      "Falta variedade entre formatos",
    ] as readonly [string, string],
    confidence: "medium",
    evidence_used: [
      "cadence.window_30d",
      "benchmark.tier_delta",
      "format_mix.dominant_share",
    ],
    ...overrides,
  };
}

function makeFallback(): EditorialVerdict {
  return {
    verdict_label: "promising",
    title: "Perfil ativo, oportunidade clara",
    paragraph:
      "Os indicadores estão próximos da referência do escalão. Há espaço para subir envolvimento ajustando formatos dominantes e reforçando a conversa.",
    priority: "Reforçar regularidade editorial e testar formatos durante 30 dias.",
    strengths: ["Perfil ativo", "Histórico consistente"] as readonly [string, string],
    limitations: ["Espaço para diversificar", "Conversa por desenvolver"] as readonly [
      string,
      string,
    ],
    confidence: "low",
    evidence_used: [],
  };
}

function metrics(
  overrides: Partial<EditorialVerdictMetrics> = {},
): EditorialVerdictMetrics {
  return {
    postsPerWeek30d: 4,
    cadenceSufficient: true,
    engagementPct: 1.2,
    benchmarkEngagementPct: 1.5,
    avgComments: 8,
    avgLikes: 220,
    competitorsCount: 3,
    postsAnalyzed: 24,
    ...overrides,
  };
}

describe("deriveEditorialVerdict", () => {
  it("returns ai source when AI matches metrics", () => {
    const res = deriveEditorialVerdict(makeAi(), metrics(), makeFallback());
    expect(res.source).toBe("ai");
    expect(res.rejectionReasons).toEqual([]);
    expect(res.verdict.confidence).toBe("medium");
  });

  it("falls back when AI is missing", () => {
    const fb = makeFallback();
    const res = deriveEditorialVerdict(null, metrics(), fb);
    expect(res.source).toBe("fallback");
    expect(res.verdict.title).toBe(fb.title);
    expect(res.verdict.confidence).toBe("low");
  });

  it("downgrades when AI recommends posting more on a healthy cadence", () => {
    const ai = makeAi({
      paragraph:
        "A cadência é fraca: o perfil deveria publicar mais nas próximas semanas para criar hábito.",
    });
    const res = deriveEditorialVerdict(ai, metrics({ postsPerWeek30d: 5 }), makeFallback());
    expect(res.source).toBe("ai_downgraded");
    expect(res.rejectionReasons).toContain("cadence_contradiction");
    expect(res.verdict.confidence).toBe("low");
    // Title preserved, paragraph replaced.
    expect(res.verdict.title).toBe(ai.title);
    expect(res.verdict.paragraph).not.toBe(ai.paragraph);
  });

  it("downgrades when AI claims audience does not react but engagement beats benchmark", () => {
    const ai = makeAi({
      paragraph:
        "A audiência não reage ao conteúdo apesar de 3,2% de envolvimento médio nas últimas 4 semanas.",
    });
    const res = deriveEditorialVerdict(
      ai,
      metrics({ engagementPct: 3.2, benchmarkEngagementPct: 1.5 }),
      makeFallback(),
    );
    expect(res.source).toBe("ai_downgraded");
    expect(res.rejectionReasons).toContain("engagement_contradiction");
  });

  it("downgrades when AI claims healthy conversation but comments are near zero", () => {
    const ai = makeAi({
      paragraph:
        "A conversa ativa nos comentários sustenta 1,1% de envolvimento médio observado nas últimas 4 semanas.",
    });
    const res = deriveEditorialVerdict(ai, metrics({ avgComments: 0.5 }), makeFallback());
    expect(res.source).toBe("ai_downgraded");
    expect(res.rejectionReasons).toContain("conversation_contradiction");
  });

  it("downgrades when AI mentions competitors with no competitor data", () => {
    const ai = makeAi({
      paragraph:
        "Os concorrentes diretos mantêm 2,3% de envolvimento médio enquanto o perfil oscila abaixo da referência.",
    });
    const res = deriveEditorialVerdict(ai, metrics({ competitorsCount: 0 }), makeFallback());
    expect(res.source).toBe("ai_downgraded");
    expect(res.rejectionReasons).toContain("phantom_competitors");
  });

  it("falls back completely when two contradictions stack", () => {
    const ai = makeAi({
      paragraph:
        "A cadência fraca e a concorrência crescente reduzem a tração editorial do perfil ao longo dos últimos 30 dias.",
    });
    const res = deriveEditorialVerdict(
      ai,
      metrics({ postsPerWeek30d: 5, competitorsCount: 0 }),
      makeFallback(),
    );
    expect(res.source).toBe("fallback");
    expect(res.rejectionReasons.length).toBeGreaterThanOrEqual(2);
    expect(res.verdict.confidence).toBe("low");
  });

  it("does not flag cadence contradiction when cadence is genuinely weak", () => {
    const ai = makeAi({
      paragraph:
        "A cadência fraca, com apenas 0,5 publicações por semana, limita a aprendizagem editorial do perfil.",
      // Override strengths so the AI doesn't simultaneously claim "Cadência
      // regular" while admitting the cadence is weak — that would (correctly)
      // trip the new cadence_reliability guard.
      strengths: ["Audiência fiel", "Histórico consistente"] as readonly [
        string,
        string,
      ],
    });
    const res = deriveEditorialVerdict(
      ai,
      metrics({ postsPerWeek30d: 0.5, cadenceSufficient: false }),
      makeFallback(),
    );
    expect(res.source).toBe("ai");
    expect(res.rejectionReasons).toEqual([]);
  });

  it("does not flag engagement contradiction when no benchmark exists", () => {
    const ai = makeAi({
      paragraph:
        "Audiência não reage ao conteúdo apesar de 0,5% de envolvimento médio em 4 semanas.",
    });
    const res = deriveEditorialVerdict(
      ai,
      metrics({ benchmarkEngagementPct: null }),
      makeFallback(),
    );
    expect(res.source).toBe("ai");
    expect(res.rejectionReasons).toEqual([]);
  });

  it("downgrades when cadenceReliability is low but AI claims a consistent rhythm", () => {
    const ai = makeAi({
      paragraph:
        "O ritmo consistente nas últimas semanas sustenta a leitura positiva do perfil.",
    });
    const res = deriveEditorialVerdict(
      ai,
      metrics({ cadenceReliability: "low" }),
      makeFallback(),
    );
    expect(res.source).toBe("ai_downgraded");
    expect(res.rejectionReasons).toContain("cadence_contradiction");
    expect(res.verdict.confidence).toBe("low");
  });

  it("detectVerdictContradictions is stable and returns ordered reasons", () => {
    const ai = makeAi({
      paragraph:
        "Cadência fraca, audiência não reage, conversa ativa nos comentários e concorrentes em alta — 4 sinais em conflito.",
    });
    const reasons = detectVerdictContradictions(
      ai,
      metrics({
        postsPerWeek30d: 5,
        cadenceSufficient: true,
        engagementPct: 3.0,
        benchmarkEngagementPct: 1.5,
        avgComments: 0,
        competitorsCount: 0,
      }),
    );
    expect(reasons).toEqual([
      "cadence_contradiction",
      "engagement_contradiction",
      "conversation_contradiction",
      "phantom_competitors",
      "attention_no_conversation_missed",
    ]);
  });

  it("falls back when sample is below 4 posts and AI claims strong/promising", () => {
    const ai = makeAi({ verdict_label: "strong" });
    const res = deriveEditorialVerdict(
      ai,
      metrics({ postsAnalyzed: 3 }),
      makeFallback(),
    );
    expect(res.rejectionReasons).toContain("low_sample_strong_claim");
    expect(res.source).toBe("fallback");
    expect(res.verdict.confidence).toBe("low");
  });

  it("downgrades when likes are healthy but comments are nearly zero without attention framing", () => {
    const ai = makeAi({
      paragraph:
        "Os números sugerem 1,6% de envolvimento médio em linha com a referência do tier ao longo das últimas 4 semanas.",
    });
    const res = deriveEditorialVerdict(
      ai,
      metrics({
        engagementPct: 1.6,
        benchmarkEngagementPct: 1.5,
        avgComments: 0.5,
      }),
      makeFallback(),
    );
    expect(res.rejectionReasons).toContain("attention_no_conversation_missed");
    expect(res.source).not.toBe("ai");
  });

  it("downgrades when paragraph contains a prescriptive verb", () => {
    const ai = makeAi({
      paragraph:
        "O padrão observado indica 1,2% de envolvimento médio nas últimas 4 semanas. Publique mais carrosséis para abrir conversa.",
    });
    const res = deriveEditorialVerdict(ai, metrics(), makeFallback());
    expect(res.rejectionReasons).toContain("prescriptive_language");
    expect(res.source).not.toBe("ai");
  });
});