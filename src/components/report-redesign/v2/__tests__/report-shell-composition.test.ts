import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Rede de segurança 6B.0 — guarda estrutural da composição do relatório.
 *
 * Os componentes P0 são grandes demais para render tests sem novas
 * dependências, por isso asseguramos as invariantes de composição por
 * análise estática do código-fonte. Se o redesign 6B mover ou remover
 * uma destas peças, o teste falha e obriga a uma decisão explícita.
 */

const root = process.cwd();
const shell = readFileSync(
  resolve(root, "src/components/report-redesign/v2/report-shell-v2.tsx"),
  "utf8",
);
const route = readFileSync(
  resolve(root, "src/routes/analyze.$username.tsx"),
  "utf8",
);

describe("ReportShellV2 — invariantes de composição", () => {
  it("renderiza Conversas em estado B e mantém-nas no estado C", () => {
    expect(shell).toMatch(/\{\(leadCaptured \|\| premiumUnlocked\) && \(/);
    expect(shell).toContain('id="conversas"');
    expect(shell).toContain("CommentIntelligenceSection");
    expect(shell).toContain("CommentIntelligenceUnavailable");
  });

  it("passa o estado comercial ao overview em vez de um booleano de teasers", () => {
    // Ramo comercial único: A ⊂ B ⊂ C.
    expect(shell).toContain('mode="free_with_engagement"');
    expect(shell).toMatch(
      /premiumUnlocked \? "pro" : leadCaptured \? "lead" : "anon"/,
    );
    expect(shell).not.toContain("showPremiumTeasers");
  });

  it("mantém o bloco de diagnóstico exclusivo do estado Pro", () => {
    expect(shell).toMatch(
      /premiumUnlocked && features\.blockDiagnosis !== "hidden"/,
    );
  });

  it("mantém o bloco de fim-de-gratuito e o feedback só no estado B", () => {
    expect(shell).toContain('id="lead-magnet-card"');
    expect(shell).toContain("ReportEndOfFreeBlock");
    expect(shell).toContain("EndFeedbackStrip");
  });

  it("continua a passar leadCaptured à navegação", () => {
    expect(shell).toContain("leadCaptured={leadCaptured}");
  });

  it("mantém o ramo antigo (mode=all) apenas no internal_lab", () => {
    expect(shell).toMatch(/variant === "internal_lab" \? \(/);
  });

  it("não reintroduz o UnlockModal legado no percurso principal", () => {
    expect(shell).not.toContain("UnlockModal");
  });
});

describe("Rota /analyze/$username — um CTA principal por estado", () => {
  it("monta a sticky gratuita apenas no estado A", () => {
    expect(route).toContain("StickyFreeCtaBar");
    expect(route).toMatch(/!leadCaptured && !premiumUnlocked/);
  });

  it("usa o ConversionSheet como motor de captura de email", () => {
    expect(route).toContain("ConversionSheet");
  });

  it("não volta a montar o UnlockModal legado", () => {
    expect(route).not.toMatch(/<UnlockModal/);
  });

  it("mantém a leitura do estado de lead no servidor", () => {
    expect(route).toContain("report-access-state");
  });
});
