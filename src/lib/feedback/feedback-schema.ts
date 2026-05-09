/**
 * Shared Zod schema for the public beta feedback form.
 * Used both client-side (react-hook-form validation) and server-side (POST handler).
 */

import { z } from "zod";

export const PURCHASE_INTENT_VALUES = ["sim", "talvez", "nao"] as const;
export type PurchaseIntent = (typeof PURCHASE_INTENT_VALUES)[number];

export const PRICING_PREFERENCE_VALUES = [
  "one_off_3",
  "bundle_5_13",
  "plano_mensal",
  "plano_agencia",
  "nao_sei",
] as const;
export type PricingPreference = (typeof PRICING_PREFERENCE_VALUES)[number];

export const PRICING_PREFERENCE_LABELS: Record<PricingPreference, string> = {
  one_off_3: "€3 — relatório único",
  bundle_5_13: "Bundle 5 relatórios por €13",
  plano_mensal: "Plano mensal",
  plano_agencia: "Plano de agência",
  nao_sei: "Ainda não sei",
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