/**
 * Tipos partilhados entre cliente e servidor para os planos de preços
 * lidos da tabela `pricing_plans`.
 */

export type PricingPlanKey = "single_report" | "pack_5_reports";

export interface PricingPlan {
  key: PricingPlanKey;
  label: string;
  priceCents: number;
  currency: string;
  unitLabel: string | null;
  sortOrder: number;
  /** Formato curto para UI ("7 €", "28 €"). */
  priceFormatted: string;
}

export type PricingPlansMap = Record<PricingPlanKey, PricingPlan>;

/**
 * Formata um preço em cêntimos como string curta no estilo Iconosquare
 * ("7 €" / "28 €"). Sem decimais quando o valor é inteiro em euros,
 * dois decimais caso contrário.
 */
export function formatPrice(cents: number, currency = "EUR"): string {
  const value = cents / 100;
  const hasDecimals = Math.round(value * 100) % 100 !== 0;
  try {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    }).format(value);
  } catch {
    return `${hasDecimals ? value.toFixed(2) : value.toFixed(0)} €`;
  }
}

/** Fallback usado se a DB ainda não respondeu ou falhar. */
export const PRICING_FALLBACK: PricingPlansMap = {
  single_report: {
    key: "single_report",
    label: "1 relatório",
    priceCents: 700,
    currency: "EUR",
    unitLabel: null,
    sortOrder: 10,
    priceFormatted: "7 €",
  },
  pack_5_reports: {
    key: "pack_5_reports",
    label: "Pack 5 relatórios",
    priceCents: 2800,
    currency: "EUR",
    unitLabel: "5,60€/relatório",
    sortOrder: 20,
    priceFormatted: "28 €",
  },
};