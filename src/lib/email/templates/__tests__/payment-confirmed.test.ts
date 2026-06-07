import { describe, it, expect } from "vitest";
import { renderPaymentConfirmed } from "../payment-confirmed";

const BASE = {
  firstName: "Maria",
  instagramHandle: "frederico.m.carvalho",
  productName: "Relatório completo",
  amountLabel: "9,00 €",
  paymentMethod: "MB WAY",
  paymentReference: "123456789",
  reportUrl: "https://auditprofiles.com/r/abc",
};

describe("renderPaymentConfirmed", () => {
  it("renders the credits breakdown when creditsGranted is provided", () => {
    const { html, text } = renderPaymentConfirmed({
      ...BASE,
      creditsGranted: { included: 1, bonus: 2 },
    });
    expect(html).toContain("Créditos ativados");
    expect(html).toContain("<strong style=\"color:#0a0e1a;\">3 créditos</strong>");
    expect(html).toContain("1 incluído na compra");
    expect(html).toContain("2 créditos extra por esta fase beta");
    expect(text).toContain("— Créditos ativados —");
    expect(text).toContain("ativámos 3 créditos");
  });

  it("omits the credits card when creditsGranted is null", () => {
    const { html, text } = renderPaymentConfirmed({
      ...BASE,
      creditsGranted: null,
    });
    expect(html).not.toContain("Créditos ativados");
    expect(html).not.toContain("Oferta beta desbloqueada");
    expect(text).not.toContain("Créditos ativados");
  });

  it("omits the credits card when creditsGranted is omitted (default)", () => {
    const { html, text } = renderPaymentConfirmed(BASE);
    expect(html).not.toContain("Créditos ativados");
    expect(text).not.toContain("Créditos ativados");
  });
});