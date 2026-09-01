import { describe, it, expect } from "vitest";
import { validateInsightsV2 } from "../validate-v2";
import { AI_INSIGHT_V2_SECTIONS } from "../types";

function baseSections() {
  const out: Record<string, { emphasis: string; text: string }> = {};
  for (const k of AI_INSIGHT_V2_SECTIONS) {
    out[k] = { emphasis: "default", text: `Texto da secção ${k} com 12% de valor.` };
  }
  return out;
}

// ~55 palavras, 3 frases, sem `%`, sem métricas privadas, sem verbos
// prescritivos. As hashtags deixaram de ser obrigatórias no parágrafo.
const VALID_PARAGRAPH =
  "O perfil mantém actividade visível com cerca de 5 publicações por semana, dominadas por Reels e centradas em poucos temas recorrentes que dão coerência à grelha. " +
  "A audiência reage com gostos mas raramente entra em conversa, num padrão típico de consumo silencioso. " +
  "O esforço de produção em vídeo não se traduz em conversa proporcional, e o território editorial mantém-se estreito.";

const VALID_VERDICT = {
  verdict_label: "promising",
  title: "Audiência fiel mas silenciosa",
  paragraph: VALID_PARAGRAPH,
  priority: "Manter a regularidade e explorar formatos durante 30 dias.",
  strengths: ["Audiência fiel e recorrente", "Cadência semanal consistente"],
  limitations: ["Pouca conversa nos comentários", "Formato muito repetitivo"],
  confidence: "medium",
  evidence_used: [
    "benchmark.tier_delta",
    "format_mix.dominant_share",
    "cadence.window_30d",
  ],
};

function payload(overrides: Partial<typeof VALID_VERDICT> = {}) {
  return {
    sections: baseSections(),
    editorial_verdict: { ...VALID_VERDICT, ...overrides },
  };
}

describe("validateInsightsV2 — editorial_verdict", () => {
  it("accepts a fully valid verdict", () => {
    const r = validateInsightsV2(payload());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.editorialVerdict?.title).toBe(VALID_VERDICT.title);
      expect(r.editorialVerdict?.strengths).toHaveLength(2);
    }
  });

  it("rejects paragraph below 30 words", () => {
    const short = "Texto demasiado curto com a hashtag #lifestyle e o número 5.";
    const r = validateInsightsV2(payload({ paragraph: short }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("PARAGRAPH_TOO_SHORT");
  });

  it("rejects paragraph above 70 words", () => {
    const huge =
      Array.from({ length: 80 }, () => "palavra").join(" ") + " 1 #lifestyle.";
    const r = validateInsightsV2(payload({ paragraph: huge }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("PARAGRAPH_TOO_LONG");
  });

  it("rejects paragraph with more than 3 sentences", () => {
    // 4 frases curtas, ~40 palavras.
    const filler = Array.from({ length: 8 }, () => "palavra").join(" ");
    const para =
      `Frase um com 5 publicações ${filler}. ` +
      `Frase dois ${filler}. ` +
      `Frase três ${filler}. ` +
      `Frase quatro ${filler}.`;
    const r = validateInsightsV2(payload({ paragraph: para }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("TOO_MANY_SENTENCES");
  });

  it("rejects engagement percentage leaked in paragraph", () => {
    const leak = VALID_PARAGRAPH.replace(
      "acima do habitual",
      "12% acima do habitual",
    );
    const r = validateInsightsV2(payload({ paragraph: leak }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("ENGAGEMENT_PERCENT_LEAK");
  });

  it("rejects private metric mentions in paragraph", () => {
    const leak = VALID_PARAGRAPH.replace(
      "A audiência reage com gostos",
      "A audiência tem bom alcance e reage com gostos",
    );
    const r = validateInsightsV2(payload({ paragraph: leak }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("PRIVATE_METRIC_LEAK");
  });

  it("rejects paragraph with prescriptive verbs", () => {
    const presc = VALID_PARAGRAPH.replace(
      "A leitura é feita",
      "Deve publicar mais carrosséis. A leitura é feita",
    );
    const r = validateInsightsV2(payload({ paragraph: presc }));
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(["RECOMMENDATION_VERB", "TOO_MANY_SENTENCES"]).toContain(r.reason);
  });

  it("rejects visual claim without visual_cover evidence", () => {
    // Insere uma afirmação visual mantendo 3 frases. Sem
    // `visual_cover.*` em evidence → deve
    // disparar VISUAL_CLAIM_UNSUPPORTED.
    const para = VALID_PARAGRAPH.replace(
      "o território editorial mantém-se estreito.",
      "a consistência visual das capas reforça a identidade.",
    );
    const r = validateInsightsV2(payload({ paragraph: para }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("VISUAL_CLAIM_UNSUPPORTED");
  });

  it("rejects title shorter than 4 words", () => {
    const r = validateInsightsV2(payload({ title: "Audiência silenciosa" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("TITLE_TOO_SHORT");
  });

  it("rejects title with digits", () => {
    const r = validateInsightsV2(
      payload({ title: "Audiência com 3 sinais fortes" }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("TITLE_HAS_NUMBER");
  });

  it("rejects title longer than 8 words", () => {
    const r = validateInsightsV2(
      payload({
        title:
          "Um titulo demasiado longo que ultrapassa claramente o limite editorial permitido",
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("TITLE_TOO_LONG");
  });

  it("rejects evidence outside the allowlist", () => {
    const r = validateInsightsV2(
      payload({
        evidence_used: [
          "benchmark.tier_delta",
          "format_mix.dominant_share",
          "unknown.signal",
        ],
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("EVIDENCE_UNKNOWN");
  });

  it("rejects PT-BR leak in priority", () => {
    const r = validateInsightsV2(
      payload({ priority: "Usar o aplicativo para aumentar as vendas." }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("PTBR_LEAK");
  });

  it("passes when verdict is absent (retrocompat)", () => {
    const r = validateInsightsV2({ sections: baseSections() });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.editorialVerdict).toBeNull();
  });
});