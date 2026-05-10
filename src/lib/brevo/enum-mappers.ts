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

export type BrevoPricingPreference = "one_off" | "subscription" | "unsure";
export type BrevoLeadSource = "unlock" | "direct" | "referral" | "organic";
export type BrevoCommercialStatus = "lead" | "customer" | "churned";

export function mapPricingPreference(
  value: string | null | undefined,
): BrevoPricingPreference | null {
  if (!value) return null;
  const v = value.toLowerCase().trim();
  // Subscription-like values.
  if (v === "subscription" || v === "recurring" || v === "monthly" || v === "yearly") {
    return "subscription";
  }
  // Explicit "I don't know".
  if (v === "unsure" || v === "dont_know" || v === "dont-know" || v === "nao_sei" || v === "other") {
    return "unsure";
  }
  // All one-off price brackets (one_off, ate_50, ate_100, ate_200, oneoff, …)
  // collapse to the single Brevo bucket.
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
    return "one_off";
  }
  // Unknown future values default to unsure rather than being dropped.
  return "unsure";
}

export function mapLeadSource(
  value: string | null | undefined,
): BrevoLeadSource {
  if (!value) return "unlock";
  const v = value.toLowerCase().trim();
  if (v.includes("unlock") || v.includes("gate") || v.includes("report")) {
    return "unlock";
  }
  if (v.includes("referral") || v.includes("affiliate") || v.includes("partner")) {
    return "referral";
  }
  if (v.includes("organic") || v.includes("seo") || v.includes("search")) {
    return "organic";
  }
  // test_qa, manual, admin, direct, etc. → direct
  return "direct";
}

export function mapCommercialStatus(
  value: string | null | undefined,
  fallback: BrevoCommercialStatus = "lead",
): BrevoCommercialStatus {
  if (!value) return fallback;
  const v = value.toLowerCase().trim();
  if (v === "convertido" || v === "customer" || v === "cliente" || v === "pago") {
    return "customer";
  }
  if (v === "churned" || v === "churn" || v === "cancelado" || v === "perdido" || v === "inativo") {
    return "churned";
  }
  // novo_pedido, relatorio_visto, feedback_recebido, contactado, em_negociacao… → lead
  return "lead";
}