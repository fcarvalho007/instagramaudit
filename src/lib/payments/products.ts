/**
 * Client-safe product catalogue for paid offers.
 *
 * Only the display strings live here. The authoritative `amount_cents`
 * lives in `products.server.ts` so the frontend never decides price.
 */

export const PRODUCT_CODES = [
  "authority_diagnosis_49",
  "report_full_9",
] as const;

export type ProductCode = (typeof PRODUCT_CODES)[number];

export interface PublicProduct {
  code: ProductCode;
  namePt: string;
  priceLabel: string;
  /** When false, hide the CTA in production UI. */
  exposed: boolean;
}

export const PUBLIC_PRODUCTS: Record<ProductCode, PublicProduct> = {
  authority_diagnosis_49: {
    code: "authority_diagnosis_49",
    namePt: "Diagnóstico de Autoridade Digital",
    priceLabel: "49€ beta",
    exposed: true,
  },
  report_full_9: {
    code: "report_full_9",
    namePt: "Relatório completo",
    priceLabel: "9€",
    exposed: false,
  },
};

export function isProductCode(value: unknown): value is ProductCode {
  return (
    typeof value === "string" &&
    (PRODUCT_CODES as readonly string[]).includes(value)
  );
}