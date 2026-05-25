import { describe, it, expect } from "vitest";
import {
  renderRequestReceived,
  renderReportReady,
  renderFeedbackRequest,
  renderCommercialFollowup,
  renderPersonalAreaSaved,
} from "../templates";

const REPORT_URL = "https://example.com/analyze/frederico.m.carvalho";
const APP_URL = "https://instagramaudit.lovable.app/app/reports";

describe("renderRequestReceived", () => {
  it("renders subject with handle, greeting and brand sign-off", () => {
    const out = renderRequestReceived({
      firstName: "Maria Silva",
      instagramHandle: "frederico.m.carvalho",
    });
    expect(out.subject).toBe("Recebemos o teu pedido para @frederico.m.carvalho");
    expect(out.text).toContain("Olá Maria,");
    expect(out.text).toContain("@frederico.m.carvalho");
    expect(out.text).toContain("fase beta");
    expect(out.text).toContain("equipa InstaBench");
    expect(out.html).toMatch(/^<!DOCTYPE html>/);
    expect(out.html).toContain('<html lang="pt-PT">');
  });

  it("falls back to generic subject and greeting without handle", () => {
    const out = renderRequestReceived({});
    expect(out.subject).toBe("Recebemos o teu pedido");
    expect(out.text).toContain("Olá,");
    expect(out.text).not.toContain("Olá undefined");
  });

  it("escapes HTML in firstName", () => {
    const out = renderRequestReceived({
      firstName: "<script>alert(1)</script>",
      instagramHandle: "x",
    });
    expect(out.html).not.toContain("<script>alert(1)");
    expect(out.html).toContain("&lt;script&gt;");
  });
});

describe("renderReportReady", () => {
  it("includes the report URL and handle in subject, text and html", () => {
    const out = renderReportReady({
      firstName: "João",
      instagramHandle: "frederico.m.carvalho",
      reportUrl: REPORT_URL,
    });
    expect(out.subject).toBe(
      "O teu relatório de @frederico.m.carvalho está disponível",
    );
    expect(out.text).toContain(REPORT_URL);
    expect(out.text).toContain("@frederico.m.carvalho");
    expect(out.html).toContain(REPORT_URL);
    expect(out.html).toContain("Abrir relatório");
  });

  it("throws when reportUrl is missing", () => {
    expect(() =>
      renderReportReady({ instagramHandle: "x", reportUrl: "" }),
    ).toThrow(/reportUrl/);
  });
});

describe("renderFeedbackRequest", () => {
  it("uses CTA URL when feedbackUrl is provided", () => {
    const out = renderFeedbackRequest({
      firstName: "Ana",
      instagramHandle: "x",
      feedbackUrl: "https://example.com/feedback/abc",
    });
    expect(out.subject).toBe("O relatório de @x foi útil?");
    expect(out.text).toContain("https://example.com/feedback/abc");
    expect(out.html).toContain("Dar feedback");
    expect(out.html).toContain("https://example.com/feedback/abc");
  });

  it("falls back to email reply when no feedbackUrl", () => {
    const out = renderFeedbackRequest({ instagramHandle: "x" });
    expect(out.text).toContain("responderes a este email");
    expect(out.html).toContain("responderes a este email");
  });

  it("uses pre-view copy when reportViewed is false", () => {
    const out = renderFeedbackRequest({
      instagramHandle: "x",
      reportViewed: false,
    });
    expect(out.text).toContain("Quando tiveres oportunidade de abrir");
    expect(out.text).not.toContain("Vimos que já abriste");
  });

  it("includes URL fallback block when feedbackUrl is provided", () => {
    const url = "https://example.com/feedback/abc";
    const out = renderFeedbackRequest({ instagramHandle: "x", feedbackUrl: url });
    expect(out.html).toContain("Em alternativa, copia o seguinte endereço");
    expect(out.html).toContain(url);
  });
});

describe("renderCommercialFollowup", () => {
  it("uses spec subject and preheader", () => {
    const out = renderCommercialFollowup({ instagramHandle: "x" });
    expect(out.subject).toBe("Próximos passos para o relatório completo");
    expect(out.html).toContain(
      "Duas opções para desbloquear o relatório completo. Sem subscrição.",
    );
  });

  it("renders Desbloquear button when checkoutUrl is provided", () => {
    const out = renderCommercialFollowup({
      instagramHandle: "x",
      checkoutUrl: "https://pay.example.com/abc",
    });
    expect(out.html).toContain("Desbloquear");
    expect(out.html).toContain("https://pay.example.com/abc");
    expect(out.text).toContain("https://pay.example.com/abc");
  });

  it("emits a mailto CTA when replyToEmail is provided without checkoutUrl", () => {
    const out = renderCommercialFollowup({
      instagramHandle: "x",
      replyToEmail: "ola@instabench.pt",
    });
    expect(out.html).toContain("mailto:ola@instabench.pt");
    expect(out.text).toContain("ola@instabench.pt");
  });

  it("mentions the two pricing options and academic use", () => {
    const out = renderCommercialFollowup({ instagramHandle: "x" });
    expect(out.text).toContain("7€");
    expect(out.text).toContain("28€");
    expect(out.text).not.toContain("IVA");
    expect(out.text).toContain("docentes");
  });
});

describe("preheader + signature", () => {
  it("emits a hidden preheader block with display:none", () => {
    const out = renderRequestReceived({ instagramHandle: "x" });
    expect(out.html).toContain("display:none");
    expect(out.html).toContain(
      "A análise está a ser preparada — recebes o relatório por email.",
    );
  });

  it("uses the equipa InstaBench sign-off", () => {
    const out = renderReportReady({
      instagramHandle: "x",
      reportUrl: REPORT_URL,
    });
    expect(out.text).toContain("Boa leitura,");
    expect(out.text).toContain("— equipa InstaBench");
    expect(out.html).toContain("equipa InstaBench");
  });
});

describe("renderPersonalAreaSaved", () => {
  it("renders subject, preheader, handle and app URL", () => {
    const out = renderPersonalAreaSaved({
      firstName: "Maria Silva",
      instagramHandle: "frederico.m.carvalho",
      appUrl: APP_URL,
    });
    expect(out.subject).toBe("O relatório foi guardado na tua área pessoal");
    expect(out.html).toContain("Acede sempre que precisares.");
    expect(out.text).toContain("Olá Maria,");
    expect(out.text).toContain("@frederico.m.carvalho");
    expect(out.text).toContain(APP_URL);
    expect(out.text).toContain("Durante a beta, o acesso é gratuito");
    expect(out.html).toContain("Abrir área pessoal");
    expect(out.html).toContain(APP_URL);
  });

  it("falls back gracefully without name or handle", () => {
    const out = renderPersonalAreaSaved({ appUrl: APP_URL });
    expect(out.text).toContain("Olá,");
    expect(out.text).toContain("o teu perfil");
    expect(out.text).not.toContain("@undefined");
  });

  it("throws when appUrl is empty", () => {
    expect(() => renderPersonalAreaSaved({ appUrl: "" })).toThrow();
  });
});
