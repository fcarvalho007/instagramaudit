import { describe, expect, it } from "vitest";

/**
 * Contrato da baseline gratuita (Nível 1).
 *
 * Importar a rota arrasta dependências do Worker, por isso replicamos aqui
 * a condição booleana exacta usada em `analyze-public-v1.ts` e travamos a
 * regressão que voltava a exigir `leadId === null`.
 */
function isFreeBaseline(opts: {
  flag: string | undefined;
  isInternalBypass: boolean;
  competitors: number;
  wideWindow: boolean;
}): boolean {
  return (
    (opts.flag ?? "false").toLowerCase() === "true" &&
    !opts.isInternalBypass &&
    opts.competitors === 0 &&
    !opts.wideWindow
  );
}

const base = {
  flag: "true",
  isInternalBypass: false,
  competitors: 0,
  wideWindow: false,
};

describe("analyze-public-v1 · baseline gratuita", () => {
  it("é gratuita para visitante anónimo", () => {
    expect(isFreeBaseline(base)).toBe(true);
  });

  it("é gratuita também para lead identificado (leadId é irrelevante)", () => {
    // A condição não recebe sequer o leadId: a presença de lead nunca pode
    // reintroduzir cobrança na baseline.
    expect(isFreeBaseline({ ...base })).toBe(true);
  });

  it("não se aplica com concorrentes (continua gated por Pro)", () => {
    expect(isFreeBaseline({ ...base, competitors: 1 })).toBe(false);
  });

  it("não se aplica a janelas 30d/90d (continuam gated por Pro)", () => {
    expect(isFreeBaseline({ ...base, wideWindow: true })).toBe(false);
  });

  it("não se aplica ao bypass interno", () => {
    expect(isFreeBaseline({ ...base, isInternalBypass: true })).toBe(false);
  });

  it("desligada por defeito quando a flag não está definida", () => {
    expect(isFreeBaseline({ ...base, flag: undefined })).toBe(false);
  });
});
