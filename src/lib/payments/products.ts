/**
 * Client-safe product catalogue for paid offers.
 *
 * Only the display strings live here. The authoritative `amount_cents`
 * lives in `products.server.ts` so the frontend never decides price.
 */

export const PRODUCT_CODES = [
  "authority_diagnosis_97",
  "report_full_9",
  "report_pack_5",
  "report_pack_10",
  "credit_pack_1",
  "credits_3",
  "credits_10",
  "credits_25",
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
  report_pack_5: {
    code: "report_pack_5",
    namePt: "Pack 5 relatórios Pro",
    priceLabel: "40€",
    strikePrice: "45€",
    priceNote: "5 desbloqueios · poupa 5€ vs avulso",
    exposed: true,
  },
  report_pack_10: {
    code: "report_pack_10",
    namePt: "Pack 10 relatórios Pro",
    priceLabel: "72€",
    strikePrice: "90€",
    priceNote: "10 desbloqueios · poupa 18€ (-20%)",
    exposed: true,
  },
  credit_pack_1: {
    code: "credit_pack_1",
    namePt: "1 crédito de análise",
    priceLabel: "9€",
    priceNote: "1 crédito · pagamento único",
    // SKU activo do lançamento controlado. A combinação pública é
    // "1 crédito · 9€"; o bónus interno de +2 créditos é aplicado pelo
    // webhook (`grantCreditPackLaunchBonus`) e registado como linha
    // separada no ledger (`credit_pack_launch_bonus`). Decisão
    // temporária — ver TEMPORARY LAUNCH OFFER em `credits.server.ts`.
    exposed: true,
  },
  credits_3: {
    code: "credits_3",
    namePt: "3 créditos de análise",
    priceLabel: "9€",
    priceNote: "3 créditos · pagamento único",
    // Reservado para uma futura fase de lançamento pública com vários
    // packs. Mantido no enum para back-compat com `lead_payments`
    // gerados em testes; nunca apresentado em CTAs hoje.
    exposed: false,
  },
  credits_10: {
    code: "credits_10",
    namePt: "10 créditos de análise",
    priceLabel: "25€",
    priceNote: "10 créditos · pagamento único",
    // Idem `credits_3`: SKU reservado, não exposto.
    exposed: false,
  },
  credits_25: {
    code: "credits_25",
    namePt: "25 créditos de análise",
    priceLabel: "49€",
    priceNote: "25 créditos · pagamento único",
    // Idem `credits_3`: SKU reservado, não exposto.
    exposed: false,
  },
};

export function isProductCode(value: unknown): value is ProductCode {
  return (
    typeof value === "string" &&
    (PRODUCT_CODES as readonly string[]).includes(value)
  );
}