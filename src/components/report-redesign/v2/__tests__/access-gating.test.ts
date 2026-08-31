import { describe, it, expect } from "vitest";

import { COMMERCIAL_SECTIONS } from "../block-config";
import { resolveSectionAccess } from "../access-gating";

/**
 * Rede de segurança 6B.0 — matriz de acesso A/B/C das secções comerciais.
 * Pura (sem React) para poder correr no ambiente node do vitest.
 */

const A = { premium: false, lead: false }; // Auditoria Instantânea
const B = { premium: false, lead: true }; // Análise Aprofundada (email)
const C = { premium: true, lead: true }; // Pro

function map(state: { premium: boolean; lead: boolean }) {
  return Object.fromEntries(
    COMMERCIAL_SECTIONS.map((s) => [
      s.id,
      resolveSectionAccess(s.tier, state.premium, state.lead),
    ]),
  );
}

describe("Secções comerciais — estrutura", () => {
  it("mantém overview e engagement gratuitos", () => {
    expect(COMMERCIAL_SECTIONS.find((s) => s.id === "overview")?.tier).toBe("free");
    expect(COMMERCIAL_SECTIONS.find((s) => s.id === "engagement")?.tier).toBe("free");
  });

  it("mantém Conversas como gratuito após email (free_email)", () => {
    const conversas = COMMERCIAL_SECTIONS.find((s) => s.id === "conversas");
    expect(conversas?.tier).toBe("free_email");
    expect(conversas?.number).toBe("06");
  });

  it("entrega Frequência já no estado anónimo", () => {
    expect(COMMERCIAL_SECTIONS.find((s) => s.id === "frequencia")?.tier).toBe("free");
  });

  it("coloca Publicações-chave e Formatos atrás do email, não do pagamento", () => {
    expect(
      COMMERCIAL_SECTIONS.find((s) => s.id === "publicacoes-chave")?.tier,
    ).toBe("free_email");
    expect(COMMERCIAL_SECTIONS.find((s) => s.id === "formatos")?.tier).toBe(
      "free_email",
    );
  });

  it("mantém exactamente duas secções Pro", () => {
    expect(COMMERCIAL_SECTIONS.filter((s) => s.tier === "pro")).toHaveLength(2);
  });

  it("numera as secções de forma contínua e única", () => {
    const numbers = COMMERCIAL_SECTIONS.map((s) => s.number);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(numbers).toEqual(["01", "02", "03", "04", "05", "06", "07", "08"]);
  });
});

describe("Estado A — Auditoria Instantânea (anónimo)", () => {
  const m = map(A);

  it("dá acesso apenas às secções gratuitas", () => {
    expect(m.overview.access).toBe("accessible");
    expect(m.engagement.access).toBe("accessible");
    expect(m.frequencia.access).toBe("accessible");
    expect(m["publicacoes-chave"].access).toBe("locked");
    expect(m.formatos.access).toBe("locked");
    expect(m.conversas.access).toBe("locked");
    expect(m.prioridades.access).toBe("locked");
  });

  it("marca Conversas com o badge 'grátis com email', nunca 'premium'", () => {
    expect(m.conversas.accessBadge).toBe("free_email");
    expect(m.conversas.group).toBe("premium");
  });

  it("mantém as secções Pro com badge premium", () => {
    for (const s of COMMERCIAL_SECTIONS.filter((x) => x.tier === "pro")) {
      expect(m[s.id].accessBadge).toBe("premium");
    }
  });
});

describe("Estado B — Análise Aprofundada (email capturado)", () => {
  const m = map(B);

  it("desbloqueia Conversas, Publicações-chave e Formatos sem desbloquear Pro", () => {
    expect(m.conversas.access).toBe("accessible");
    expect(m.conversas.accessBadge).toBe("free");
    expect(m.conversas.group).toBe("incluido");
    expect(m["publicacoes-chave"].access).toBe("accessible");
    expect(m.formatos.access).toBe("accessible");
    expect(m["diagnostico-editorial"].access).toBe("locked");
    expect(m.prioridades.access).toBe("locked");
  });
});

describe("Estado C — Pro", () => {
  const m = map(C);

  it("desbloqueia todas as secções e agrupa-as em 'incluido'", () => {
    for (const s of COMMERCIAL_SECTIONS) {
      expect(m[s.id].access).toBe("accessible");
      expect(m[s.id].group).toBe("incluido");
    }
  });

  it("nunca deixa uma secção acessível em A/B mas bloqueada em C", () => {
    const a = map(A);
    const b = map(B);
    for (const s of COMMERCIAL_SECTIONS) {
      if (a[s.id].access === "accessible" || b[s.id].access === "accessible") {
        expect(m[s.id].access).toBe("accessible");
      }
    }
  });
});


describe("Overview — composição comercial", () => {
  it("não renderiza teasers Pro dentro do overview", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../report-overview-block.tsx", import.meta.url),
      "utf8",
    );
    expect(src).not.toContain("PremiumTeaserCard");
    expect(src).toContain("FreeDeepenTeaser");
  });

  it("o preview de publicações não tem CTA próprio (gate único no estado A)", async () => {
    const fs = await import("node:fs/promises");
    const src = await fs.readFile(
      new URL("../report-post-comparison.tsx", import.meta.url),
      "utf8",
    );
    expect(src).not.toContain("Aprofundar gratuitamente");
    expect(src).toContain("post_comparison_preview_viewed");
  });
});
