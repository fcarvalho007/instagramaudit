import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

import { buildProCheckoutSearch } from "../pro-checkout-search";
import { PUBLIC_PRODUCTS } from "@/lib/payments/products";
import ptReport from "@/i18n/locales/pt/report.json";

const endOfFreeSrc = readFileSync(
  "src/components/report-redesign/v2/end-of-free-block.tsx",
  "utf8",
);
const stickySrc = readFileSync(
  "src/components/report-redesign/v2/sticky-unlock-bar.tsx",
  "utf8",
);

describe("Pro gate — handoff para /checkout/report-full", () => {
  it("inclui report_cache_key quando existe snapshotId", () => {
    expect(
      buildProCheckoutSearch({
        source: "lock_gate",
        handle: "pingodoce",
        snapshotId: "snap-123",
        returnPath: "/analyze/pingodoce",
      }),
    ).toEqual({
      source: "lock_gate",
      username: "pingodoce",
      report_cache_key: "snap-123",
      return: "/analyze/pingodoce",
    });
  });

  it("omite report_cache_key e username quando não existem", () => {
    const search = buildProCheckoutSearch({
      source: "sticky_unlock_bar",
      handle: null,
      snapshotId: null,
      returnPath: "/",
    });
    expect(search.report_cache_key).toBeUndefined();
    expect(search.username).toBeUndefined();
    expect(search.source).toBe("sticky_unlock_bar");
  });
});

describe("Pro gate — superfícies directas", () => {
  it("o bloco final vai ao checkout e não abre o modal premium", () => {
    expect(endOfFreeSrc).toContain('goToProCheckout("lock_gate")');
    expect(endOfFreeSrc).not.toContain("handlePremiumAccessClick");
  });

  it("a sticky vai ao checkout e não abre o modal premium", () => {
    expect(stickySrc).toContain('goToProCheckout("sticky_unlock_bar")');
    expect(stickySrc).not.toContain("handlePremiumAccessClick");
  });

  it("a sticky continua desktop-only e sem contador de secções", () => {
    expect(stickySrc).toContain("hidden md:block");
    expect(stickySrc).not.toMatch(/secç(ão|ões)\s*(bloquead|restant)/i);
  });

  it("o preço das duas superfícies vem de PUBLIC_PRODUCTS", () => {
    expect(endOfFreeSrc).toContain("PUBLIC_PRODUCTS.report_full_9.priceLabel");
    expect(stickySrc).toContain("PUBLIC_PRODUCTS.report_full_9.priceLabel");
    expect(PUBLIC_PRODUCTS.report_full_9.priceLabel).toBeTruthy();
  });
});

describe("Pro gate — copy", () => {
  const eof = (ptReport as Record<string, any>)["end_of_free"];

  it("vende explicação + orientação, sem contadores de secções", () => {
    expect(eof.eyebrow).toBe("Análise Pro");
    expect(eof.cta).toBe("Desbloquear Análise Pro");
    expect(JSON.stringify(eof)).not.toMatch(/6 secç|todas as secç/i);
  });
});
