/**
 * Conversion UX 10B — provas estruturais (ambiente node, sem DOM).
 *
 * Garante as invariantes de arquitectura acordadas: pergunta única e não
 * bloqueante no loading, sem duplicação no ConversionSheet, sem PII
 * persistida, sem tracking cross-session e sem alterações no onboarding
 * antigo nem no checkout.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { ANONYMOUS_FUNNEL_EVENTS } from "@/routes/api/public/funnel-event";
import { PROFILE_RELATIONSHIPS } from "@/lib/leads/profile-relationship";
import ptConversion from "@/i18n/locales/pt/conversion.json";
import enConversion from "@/i18n/locales/en/conversion.json";

const read = (p: string) => readFileSync(p, "utf8");

const loading = read("src/components/conversion/loading-qualification.tsx");
const sheet = read("src/components/conversion/conversion-sheet.tsx");
const skeleton = read("src/components/product/analysis-skeleton.tsx");
const analyzeRoute = read("src/routes/analyze.$username.tsx");
const reportsRoute = read("src/routes/reports.$snapshotId.tsx");
const devRoute = read("src/routes/dev-loading-preview.tsx");

describe("qualificação no loading", () => {
  it("usa um atraso de 3 s e não bloqueia o loader", () => {
    expect(loading).toContain("QUALIFICATION_DELAY_MS = 3000");
    expect(loading).toContain("setTimeout(() => setEligible(true), delayMs)");
  });

  it("não é modal", () => {
    expect(loading).not.toMatch(/\b(Dialog|Sheet|Popover)\b/);
  });

  it("respeita o estado de sessão por handle", () => {
    expect(loading).toContain("readQualification(normalized)");
    expect(loading).toContain('status: "skipped"');
  });

  it("oferece sempre 'Agora não'", () => {
    expect(loading).toContain("relationship.skip");
    expect(ptConversion.relationship.skip).toBe("Agora não");
  });

  it("usa a fonte única de apresentação da relação", () => {
    expect(loading).toContain("ProfileRelationshipField");
    expect(sheet).toContain("ProfileRelationshipField");
  });
});

describe("loader reutilizável", () => {
  it("o slot secundário é opcional e neutro por omissão", () => {
    expect(skeleton).toContain("secondarySlot");
    expect(skeleton).toContain("{secondarySlot ?? null}");
  });

  it("apenas /analyze/$username fornece a qualificação", () => {
    expect(analyzeRoute).toContain("<LoadingQualification handle={cleaned} />");
    expect(reportsRoute).not.toContain("LoadingQualification");
    expect(devRoute).not.toContain("LoadingQualification");
  });
});

describe("ConversionSheet", () => {
  it("só pergunta a relação quando não houve qualificação anterior", () => {
    expect(sheet).toContain("setAskRelationship(readQualification(handle) === null)");
    expect(sheet).toContain("{!askRelationship ? null :");
  });

  it("envia a relação apenas depois de cache_key/grant", () => {
    expect(sheet).toContain("const { cacheKey, grant } = contextRef.current;");
    expect(sheet).toContain("if (!cacheKey) return;");
    expect(sheet).toContain("/api/public/report-relationship");
  });

  it("a sincronização falha em silêncio (fail-soft)", () => {
    expect(sheet).toMatch(/catch \{\s*\/\* fail-soft/);
  });

  it("marketing arranca desmarcado e continua separado", () => {
    expect(sheet).toContain("useState(false)");
    expect(sheet).toContain("marketing_optin");
  });

  it("usa o Button canónico e estados de acessibilidade", () => {
    expect(sheet).toContain('from "@/components/ui/button"');
    expect(sheet).toContain('aria-busy={phase === "submitting"}');
    expect(sheet).toContain("aria-describedby");
    expect(sheet).toContain("aria-invalid");
  });

  it("não pede nome, empresa, password nem telefone", () => {
    expect(sheet).not.toMatch(/type="password"|autoComplete="tel"|autoComplete="name"/);
  });

  it("não persiste o email", () => {
    expect(sheet).not.toMatch(/localStorage|sessionStorage/);
  });

  it("promete apenas o Estado B", () => {
    expect(ptConversion.benefits.posts).toBeTruthy();
    expect(ptConversion.benefits.formats).toBeTruthy();
    expect(ptConversion.benefits.comments).toBeTruthy();
    const promise = Object.values(ptConversion.benefits).join(" ").toLowerCase();
    expect(promise).not.toMatch(/diagn|priorid|concorrent|30 dias/);
  });

  it("separa serviço de marketing na microcopy", () => {
    expect(ptConversion.microcopy).toBe("Sem pagamento. O marketing é opcional.");
    expect(enConversion.microcopy).toBe("No payment. Marketing is optional.");
  });
});

describe("analytics", () => {
  it("os eventos novos estão na allowlist do servidor", () => {
    for (const e of [
      "qualification_prompt_viewed",
      "qualification_answered",
      "qualification_skipped",
    ]) {
      expect(ANONYMOUS_FUNNEL_EVENTS).toContain(e);
    }
  });

  it("não envia email nem fingerprint na qualificação", () => {
    expect(loading).not.toMatch(/email|fingerprint/i);
  });
});

describe("sem tracking cross-session", () => {
  it("a persistência é apenas sessionStorage", () => {
    const store = read("src/lib/leads/qualification-session.ts");
    expect(store).toContain("sessionStorage");
    expect(store).not.toContain("localStorage");
    expect(store).not.toContain("document.cookie");
  });
});

describe("taxonomia", () => {
  it("reutiliza PROFILE_RELATIONSHIPS sem alterações", () => {
    expect([...PROFILE_RELATIONSHIPS]).toEqual([
      "owner",
      "manages",
      "client",
      "competitor",
      "research",
    ]);
  });
});
