import { describe, expect, it } from "vitest";
import { renderPaymentConfirmed } from "../templates/payment-confirmed";

const baseArgs = {
  firstName: "Frederico",
  instagramHandle: "webhspt",
  productName: "Relatório completo",
  amountLabel: "9,90 €",
  paymentMethod: "Multibanco",
  paymentReference: "REF-12345",
  reportUrl: "https://example.com/reports/abc",
};

function assertNoBrokenPlaceholders(html: string, text: string) {
  for (const blob of [html, text]) {
    expect(blob).not.toMatch(/\{\{/);
    expect(blob).not.toMatch(/\bundefined\b/);
    expect(blob).not.toMatch(/>\s*null\s*</);
  }
}

describe("renderPaymentConfirmed", () => {
  it("renders full data with handle, info card, signature and receipt rows", () => {
    const r = renderPaymentConfirmed(baseArgs);
    expect(r.subject).toBe(
      "Pagamento confirmado — relatório completo desbloqueado",
    );
    expect(r.html).toContain("@webhspt");
    expect(r.html).toContain("acesso vitalício às 6 secções");
    expect(r.html).toContain("Relatório completo");
    expect(r.html).toContain("9,90 €");
    expect(r.html).toContain("Multibanco");
    expect(r.html).toContain("REF-12345");
    expect(r.html).toContain("Abrir relatório completo");
    expect(r.html).toContain("Obrigado pela confiança,");
    expect(r.html).toContain("Frederico · AuditProfiles");
    expect(r.text).toContain("@webhspt");
    expect(r.text).toContain("acesso vitalício às 6 secções");
    expect(r.text).toContain("Obrigado pela confiança,");
    expect(r.text).toContain("Frederico · AuditProfiles");
    assertNoBrokenPlaceholders(r.html, r.text);
  });

  it("falls back gracefully when handle is missing", () => {
    const r = renderPaymentConfirmed({ ...baseArgs, instagramHandle: null });
    expect(r.html).toContain(
      "O relatório completo está desbloqueado — com acesso vitalício às 6 secções.",
    );
    expect(r.text).toContain(
      "O relatório completo está desbloqueado — com acesso vitalício às 6 secções.",
    );
    expect(r.html).not.toMatch(/@undefined|@null|@\s/);
    assertNoBrokenPlaceholders(r.html, r.text);
  });

  it("omits optional method and reference rows when missing", () => {
    const r = renderPaymentConfirmed({
      ...baseArgs,
      paymentMethod: null,
      paymentReference: null,
    });
    expect(r.html).not.toContain("Método de pagamento");
    expect(r.html).not.toContain("Referência");
    expect(r.text).not.toContain("Método de pagamento");
    expect(r.text).not.toContain("Referência");
    assertNoBrokenPlaceholders(r.html, r.text);
  });

  it("renders amount dynamically and never hardcodes a price", () => {
    const r = renderPaymentConfirmed({ ...baseArgs, amountLabel: "1,23 €" });
    expect(r.html).toContain("1,23 €");
    expect(r.text).toContain("1,23 €");
    // No other euro amounts should appear (no hardcoded 9,90 / 9,00 / 19,00 etc.).
    expect(r.html).not.toMatch(/9,90\s*€/);
    expect(r.html).not.toMatch(/9,00\s*€/);
    expect(r.text).not.toMatch(/9,90\s*€/);
    expect(r.text).not.toMatch(/9,00\s*€/);
  });

  it("includes the blue reassurance info card", () => {
    const r = renderPaymentConfirmed(baseArgs);
    expect(r.html).toContain("background-color:#eff6ff");
    expect(r.html).toContain(
      "Pagamento único, sem subscrição nem renovação automática.",
    );
    expect(r.html).toContain("O relatório fica guardado na tua conta.");
  });

  it("uses the local signature override (no shared 'equipa AuditProfiles')", () => {
    const r = renderPaymentConfirmed(baseArgs);
    expect(r.html).not.toContain("equipa AuditProfiles");
    expect(r.text).not.toContain("equipa AuditProfiles");
    expect(r.html).not.toContain("Até já,");
    expect(r.text).not.toContain("Até já,");
  });
});
