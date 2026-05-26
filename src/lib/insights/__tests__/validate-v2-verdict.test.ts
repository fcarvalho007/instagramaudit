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

// 99 palavras, 4 frases, contém #lifestyle (hashtag), tem um dígito (`5`),
// sem `%`, sem métricas privadas, sem verbos prescritivos.
const VALID_PARAGRAPH =
  "O perfil mantém actividade visível com cerca de 5 publicações por semana, dominadas por Reels e centradas em poucos temas recorrentes que dão coerência à grelha. " +
  "A leitura é feita contra o benchmark do escalão, como se pode consultar nas secções abaixo deste relatório, e o sinal aponta para um perfil acima do habitual. " +
  "A audiência reage com gostos mas raramente entra em conversa, num padrão típico de consumo silencioso a que vale a pena prestar atenção. " +
  "Em termos de assinatura temática, a hashtag #lifestyle aparece de forma recorrente e ajuda a localizar o território editorial, sem grande dispersão.";

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

  it("rejects paragraph below 90 words", () => {
    const short = "Texto demasiado curto com a hashtag #lifestyle e o número 5.";
    const r = validateInsightsV2(payload({ paragraph: short }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("PARAGRAPH_TOO_SHORT");
  });

  it("rejects paragraph above 140 words", () => {
    // 145 palavras curtas + 1 dígito + uma hashtag para não ser apanhado
    // primeiro pelo HASHTAGS_NOT_HANDLED. Apanha em PARAGRAPH_TOO_LONG.
    const huge =
      Array.from({ length: 145 }, () => "palavra").join(" ") + " 1 #lifestyle.";
    const r = validateInsightsV2(payload({ paragraph: huge }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("PARAGRAPH_TOO_LONG");
  });

  it("rejects paragraph with more than 4 sentences", () => {
    // 5 frases curtas, 95 palavras, com hashtag e dígito.
    const filler = Array.from({ length: 17 }, () => "palavra").join(" ");
    const para =
      `Frase um com 5 publicações ${filler}. ` +
      `Frase dois ${filler}. ` +
      `Frase três ${filler}. ` +
      `Frase quatro ${filler}. ` +
      `Frase cinco menciona a hashtag #lifestyle ${filler}.`;
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

  it("rejects paragraph that does not handle hashtags", () => {
    // 99 palavras, 4 frases, sem `#` e sem frase de ausência.
    const filler = Array.from({ length: 22 }, () => "palavra").join(" ");
    const para =
      `O perfil publica 5 vezes por semana ${filler}. ` +
      `A leitura é feita contra o benchmark ${filler}. ` +
      `A audiência consome em silêncio ${filler}. ` +
      `O território editorial é coerente ${filler}.`;
    const r = validateInsightsV2(payload({ paragraph: para }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("HASHTAGS_NOT_HANDLED");
  });

  it("accepts paragraph with explicit hashtag absence phrase", () => {
    const para =
      "O perfil mantém actividade visível com cerca de 5 publicações por semana, dominadas por Reels e centradas em poucos temas recorrentes que dão coerência à grelha. " +
      "A leitura é feita contra o benchmark do escalão, como se pode consultar nas secções abaixo deste relatório, e o sinal aponta para um perfil acima do habitual. " +
      "A audiência reage com gostos mas raramente entra em conversa, num padrão típico de consumo silencioso a que vale a pena prestar atenção. " +
      "Nesta amostra, não há hashtags suficientemente claras ou recorrentes para definir um território editorial estável.";
    const r = validateInsightsV2(payload({ paragraph: para }));
    expect(r.ok).toBe(true);
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
    const para = VALID_PARAGRAPH.replace(
      "Em termos de assinatura temática",
      "A consistência visual das capas é evidente. Em termos de assinatura temática",
    );
    // 99 + ~6 palavras extra; ainda dentro do limite mas o número de
    // frases sobe para 5. Reduz uma das frases originais para manter ≤4.
    const trimmed = para.replace(
      "A leitura é feita contra o benchmark do escalão, como se pode consultar nas secções abaixo deste relatório, e o sinal aponta para um perfil acima do habitual. ",
      "",
    );
    const r = validateInsightsV2(payload({ paragraph: trimmed }));
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