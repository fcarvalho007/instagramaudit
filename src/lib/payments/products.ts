/**
 * Client-safe product catalogue for paid offers.
 *
 * Only the display strings live here. The authoritative `amount_cents`
 * lives in `products.server.ts` so the frontend never decides price.
 */

export const PRODUCT_CODES = [
  "authority_diagnosis_97",
  "report_full_9",
] as const;

export type ProductCode = (typeof PRODUCT_CODES)[number];

export interface PublicProduct {
  code: ProductCode;
  namePt: string;
  priceLabel: string;
  /** Optional strikethrough next to the price (e.g. "149€"). */
  strikePrice?: string;
  /** Small caption under the price (e.g. "por relatório"). */
  priceNote?: string;
  /** When false, hide the CTA in production UI. */
  exposed: boolean;
}

export const PUBLIC_PRODUCTS: Record<ProductCode, PublicProduct> = {
  authority_diagnosis_97: {
    code: "authority_diagnosis_97",
    namePt: "Diagnóstico de Autoridade Digital",
    priceLabel: "97€",
    strikePrice: "149€",
    priceNote: "preço de lançamento · sobe para 149€",
    exposed: true,
  },
  report_full_9: {
    code: "report_full_9",
    namePt: "Relatório completo",
    priceLabel: "9€",
    priceNote: "por relatório · pagamento único",
    exposed: true,
  },
};

export function isProductCode(value: unknown): value is ProductCode {
  return (
    typeof value === "string" &&
    (PRODUCT_CODES as readonly string[]).includes(value)
  );
}