import { describe, it, expect } from "vitest";
import {
  renderRequestReceived,
  renderReportReady,
  renderFeedbackRequest,
  renderCommercialFollowup,
} from "../templates";

const REPORT_URL = "https://example.com/analyze/frederico.m.carvalho";

describe("renderRequestReceived", () => {
  it("renders subject, handle and brand sign-off", () => {
    const out = renderRequestReceived({
      firstName: "Maria Silva",
      instagramHandle: "frederico.m.carvalho",
    });
    expect(out.subject).toBe("Recebemos o teu pedido beta do InstaBench");
    expect(out.text).toContain("Olá Maria,");
    expect(out.text).toContain("@frederico.m.carvalho");
    expect(out.text).toContain("revisto manualmente");
    expect(out.text).toContain("InstaBench");
    expect(out.html).toMatch(/^<!DOCTYPE html>/);
    expect(out.html).toContain('<html lang="pt-PT">');
  });

  it("falls back to generic greeting when no name", () => {
    const out = renderRequestReceived({ instagramHandle: "x" });
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
  it("includes the report URL in subject, text and html", () => {
    const out = renderReportReady({
      firstName: "João",
      instagramHandle: "frederico.m.carvalho",
      reportUrl: REPORT_URL,
    });
    expect(out.subject).toBe("O teu relatório InstaBench já está pronto");
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
    expect(out.subject).toBe("Podes dar feedback ao teu relatório InstaBench?");
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
    expect(out.text).toContain("Quando tiveres oportunidade de consultar");
    expect(out.text).not.toContain("Notámos que já consultaste");
  });

  it("includes URL fallback block when feedbackUrl is provided", () => {
    const url = "https://example.com/feedback/abc";
    const out = renderFeedbackRequest({ instagramHandle: "x", feedbackUrl: url });
    // Fallback block (not the button) — escaped URL rendered as text
    expect(out.html).toContain("Em alternativa, copia o seguinte endereço");
    expect(out.html).toContain(url);
  });
});

describe("renderCommercialFollowup", () => {
  it("includes pricingOption sentence when provided", () => {
    const out = renderCommercialFollowup({
      firstName: "Pedro",
      instagramHandle: "x",
      pricingOption: "Plano mensal",
    });
    expect(out.subject).toBe(
      "Próximo passo para analisar melhor o teu Instagram",
    );
    expect(out.text).toContain("Plano mensal");
    expect(out.html).toContain("Plano mensal");
  });

  it("maps known pricing codes to readable labels", () => {
    const out = renderCommercialFollowup({
      instagramHandle: "x",
      pricingOption: "single_3_eur",
    });
    expect(out.text).toContain("Relatório único (€3 + IVA)");
    expect(out.text).not.toContain("single_3_eur");
    expect(out.html).toContain("Relatório único (€3 + IVA)");
  });

  it("omits pricing sentence and CTA mailto when neither provided", () => {
    const out = renderCommercialFollowup({ instagramHandle: "x" });
    expect(out.text).not.toContain("Plano mensal");
    expect(out.text).not.toContain("mostraste interesse");
    expect(out.html).not.toContain("mailto:");
  });

  it("emits a mailto CTA when replyToEmail is provided", () => {
    const out = renderCommercialFollowup({
      instagramHandle: "x",
      replyToEmail: "ola@instabench.pt",
    });
    expect(out.html).toContain("mailto:ola@instabench.pt");
    expect(out.text).toContain("ola@instabench.pt");
  });
});

describe("preheader + signature", () => {
  it("emits a hidden preheader block with display:none", () => {
    const out = renderRequestReceived({ instagramHandle: "x" });
    expect(out.html).toContain("display:none");
    expect(out.html).toContain("Vamos rever manualmente");
  });

  it("uses the Frederico — InstaBench sign-off", () => {
    const out = renderReportReady({
      instagramHandle: "x",
      reportUrl: REPORT_URL,
    });
    expect(out.text).toContain("Obrigado,");
    expect(out.text).toContain("Frederico — InstaBench");
    expect(out.html).toContain("Frederico");
  });
});