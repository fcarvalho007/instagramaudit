/**
 * Shared Zod schema for the public beta feedback form.
 * Used both client-side (react-hook-form validation) and server-side (POST handler).
 */

import { z } from "zod";

export const PURCHASE_INTENT_VALUES = ["sim", "talvez", "nao"] as const;
export type PurchaseIntent = (typeof PURCHASE_INTENT_VALUES)[number];

export const PRICING_PREFERENCE_VALUES = [
  "single_report_7",
  "pack_5_reports_28",
  "not_ready_to_pay",
  "other",
] as const;
export type PricingPreference = (typeof PRICING_PREFERENCE_VALUES)[number];

export const PRICING_PREFERENCE_LABELS: Record<PricingPreference, string> = {
  single_report_7: "1 relatório — 7€",
  pack_5_reports_28: "Pack 5 relatórios — 28€",
  not_ready_to_pay: "Ainda não estou pronto/a para pagar",
  other: "Outra opção",
};

export const PURCHASE_INTENT_LABELS: Record<PurchaseIntent, string> = {
  sim: "Sim",
  talvez: "Talvez",
  nao: "Não",
};

export const feedbackFormSchema = z.object({
  usefulness_score: z
    .number({ message: "Indica de 1 a 5 quão útil foi o relatório." })
    .int()
    .min(1)
    .max(5),
  clarity_text: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres.")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  missing_text: z
    .string()
    .trim()
    .max(500, "Máximo 500 caracteres.")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  purchase_intent: z.enum(PURCHASE_INTENT_VALUES, {
    message: "Escolhe uma opção.",
  }),
  pricing_preference: z.enum(PRICING_PREFERENCE_VALUES).optional(),
  contact_consent: z.boolean().default(false),
});

export type FeedbackFormInput = z.input<typeof feedbackFormSchema>;
export type FeedbackFormValues = z.output<typeof feedbackFormSchema>;