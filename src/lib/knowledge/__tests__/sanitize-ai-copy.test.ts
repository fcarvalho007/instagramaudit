import { describe, it, expect } from "vitest";
import { sanitizeAiCopy } from "../sanitize-ai-copy";

describe("sanitizeAiCopy", () => {
  it("aprova texto editorial limpo", () => {
    const r = sanitizeAiCopy(
      "Este perfil regista uma cadência elevada, o que sugere consistência editorial.",
    );
    expect(r.ok).toBe(true);
    expect(r.violations).toEqual([]);
  });

  it("apanha termos técnicos", () => {
    const r = sanitizeAiCopy("O payload mostra engagement_pct acima da média.");
    expect(r.ok).toBe(false);
    expect(r.violations.map((v) => v.kind)).toEqual([
      "technical_term",
      "technical_term",
    ]);
  });

  it("apanha atribuição directa do perfil às fontes", () => {
    const r = sanitizeAiCopy(
      "Segundo a Socialinsider, este perfil está abaixo da média.",
    );
    expect(r.ok).toBe(false);
    expect(r.violations[0]!.kind).toBe("source_attribution");
  });

  it("apanha menções a métricas restritas quando hasReachData=false", () => {
    const r = sanitizeAiCopy(
      "O alcance médio é alto e gera muitos saves e partilhas.",
    );
    expect(r.ok).toBe(false);
    const kinds = r.violations.map((v) => v.kind);
    expect(kinds).toContain("invented_metric");
  });

  it("permite métricas restritas quando hasReachData=true", () => {
    const r = sanitizeAiCopy(
      "O alcance e os saves indicam um bom desempenho.",
      { hasReachData: true },
    );
    expect(r.ok).toBe(true);
  });

  it("apanha URLs e domínios das fontes editoriais", () => {
    const r = sanitizeAiCopy(
      "Mais detalhes em https://socialinsider.io ou em hootsuite.com/blog.",
    );
    expect(r.ok).toBe(false);
    const kinds = r.violations.map((v) => v.kind);
    expect(kinds.filter((k) => k === "external_link").length).toBeGreaterThanOrEqual(2);
  });

  it("é resiliente a entrada vazia/inválida", () => {
    expect(sanitizeAiCopy("").ok).toBe(true);
    // @ts-expect-error -- testing runtime resilience
    expect(sanitizeAiCopy(null).ok).toBe(true);
  });
});
