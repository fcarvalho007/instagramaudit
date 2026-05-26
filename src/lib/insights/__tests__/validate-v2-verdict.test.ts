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

const VALID_PARAGRAPH =
  "O perfil mantém actividade visível com cerca de 5 publicações por semana, dominadas por Reels e centradas em poucos temas recorrentes. " +
  "O envolvimento deve ser lido contra o benchmark do escalão, como se pode consultar mais abaixo neste relatório. " +
  "A audiência reage com gostos mas raramente entra em conversa, num padrão típico de consumo silencioso. " +
  "Nesta amostra, não há hashtags suficientemente claras ou recorrentes para definir um território editorial estável.";

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

  it("rejects paragraph too short", () => {
    const r = validateInsightsV2(payload({ paragraph: "Texto curto com 1 número." }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("PARAGRAPH_TOO_SHORT");
  });

  it("rejects paragraph without digits", () => {
    // 100 palavras sem dígito → falha por GENERIC_OUTPUT (já passa o min).
    const long = Array.from({ length: 100 }, () => "palavra").join(" ");
    const r = validateInsightsV2(payload({ paragraph: long }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("GENERIC_OUTPUT");
  });

  it("rejects paragraph above 220 words", () => {
    // 225 palavras curtas — fica abaixo do limite de chars (1400)
    // mas acima do limite de palavras.
    const huge =
      Array.from({ length: 225 }, () => "ab").join(" ") + " 1";
    const r = validateInsightsV2(payload({ paragraph: huge }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("PARAGRAPH_TOO_LONG");
  });

  it("rejects paragraph with prescriptive verbs", () => {
    const presc = VALID_PARAGRAPH.replace(
      "A leitura principal é",
      "Deve publicar mais carrosséis e a leitura principal é",
    );
    const r = validateInsightsV2(payload({ paragraph: presc }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("RECOMMENDATION_VERB");
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
      payload({ priority: "Usar o aplicativo para aumentar 10% das vendas." }),
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