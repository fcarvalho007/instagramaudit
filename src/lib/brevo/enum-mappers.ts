/**
 * Maps app-internal string values to the exact enum labels defined on the
 * Brevo account schema for category-typed attributes.
 *
 * Brevo silently drops attribute values that don't match a known enum label,
 * so any change to the Brevo dropdowns (PRICING_PREFERENCE, LEAD_SOURCE,
 * COMMERCIAL_STATUS) MUST be mirrored here.
 *
 * Brevo enums (as of 2026-05):
 *   PRICING_PREFERENCE: one_off | subscription | unsure
 *   LEAD_SOURCE:        unlock | direct | referral | organic
 *   COMMERCIAL_STATUS:  lead | customer | churned
 */

/**
 * Brevo category attributes accept the enum's numeric `value`, not the label
 * string. Sending a label silently drops the field. The numeric IDs below
 * match the order the enums were created in the Brevo account schema.
 */

const PRICING_PREFERENCE_IDS = {
  one_off: 1,
  subscription: 2,
  unsure: 3,
} as const;

const LEAD_SOURCE_IDS = {
  unlock: 1,
  direct: 2,
  referral: 3,
  organic: 4,
} as const;

const COMMERCIAL_STATUS_IDS = {
  lead: 1,
  customer: 2,
  churned: 3,
} as const;

export type BrevoPricingPreference = keyof typeof PRICING_PREFERENCE_IDS;
export type BrevoLeadSource = keyof typeof LEAD_SOURCE_IDS;
export type BrevoCommercialStatus = keyof typeof COMMERCIAL_STATUS_IDS;

export function mapPricingPreference(
  value: string | null | undefined,
): number | null {
  if (!value) return null;
  const v = value.toLowerCase().trim();
  if (v === "subscription" || v === "recurring" || v === "monthly" || v === "yearly") {
    return PRICING_PREFERENCE_IDS.subscription;
  }
  if (v === "unsure" || v === "dont_know" || v === "dont-know" || v === "nao_sei" || v === "other") {
    return PRICING_PREFERENCE_IDS.unsure;
  }
  if (
    v === "one_off" ||
    v === "oneoff" ||
    v === "one-off" ||
    v.startsWith("ate_") ||
    v.startsWith("up_to_") ||
    v.startsWith("under_") ||
    v.startsWith("below_") ||
    v.startsWith("pago_unico") ||
    /\d/.test(v)
  ) {
    return PRICING_PREFERENCE_IDS.one_off;
  }
  return PRICING_PREFERENCE_IDS.unsure;
}

export function mapLeadSource(
  value: string | null | undefined,
): number {
  if (!value) return LEAD_SOURCE_IDS.unlock;
  const v = value.toLowerCase().trim();
  if (v.includes("unlock") || v.includes("gate") || v.includes("report")) {
    return LEAD_SOURCE_IDS.unlock;
  }
  if (v.includes("referral") || v.includes("affiliate") || v.includes("partner")) {
    return LEAD_SOURCE_IDS.referral;
  }
  if (v.includes("organic") || v.includes("seo") || v.includes("search")) {
    return LEAD_SOURCE_IDS.organic;
  }
  return LEAD_SOURCE_IDS.direct;
}

export function mapCommercialStatus(
  value: string | null | undefined,
  fallback: BrevoCommercialStatus = "lead",
): number {
  if (!value) return COMMERCIAL_STATUS_IDS[fallback];
  const v = value.toLowerCase().trim();
  if (v === "convertido" || v === "customer" || v === "cliente" || v === "pago") {
    return COMMERCIAL_STATUS_IDS.customer;
  }
  if (v === "churned" || v === "churn" || v === "cancelado" || v === "perdido" || v === "inativo") {
    return COMMERCIAL_STATUS_IDS.churned;
  }
  return COMMERCIAL_STATUS_IDS.lead;
}