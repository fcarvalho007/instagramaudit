/**
 * Client-safe enums + Zod schema for the public report unlock flow.
 *
 * The server module `unlock.server.ts` is import-protected; we mirror its
 * tuples here and assert parity in `unlock-flow.test.ts`.
 */
import { z } from "zod";

import { LEAD_QUALIFICATIONS } from "@/lib/leads/qualification";

export const PROFILE_OWNERSHIPS = [
  "own_profile",
  "brand_profile",
  "client_profile",
  "competitor_research",
  "curiosity",
] as const;

export const GOALS = [
  "improve_content",
  "benchmark_competitors",
  "client_report",
  "grow_audience",
  "validate_brand",
  "other",
] as const;

export const USER_TYPES = [
  "creator",
  "brand",
  "agency",
  "consultant",
  "ecommerce",
  "student",
  "other",
] as const;

export const PRICING_PREFERENCES = [
  "under_3",
  "under_9",
  "under_19",
  "free_only",
  "not_sure",
] as const;

export type ProfileOwnership = (typeof PROFILE_OWNERSHIPS)[number];
export type Goal = (typeof GOALS)[number];
export type UserType = (typeof USER_TYPES)[number];
export type PricingPreference = (typeof PRICING_PREFERENCES)[number];

export const PROFILE_OWNERSHIP_LABELS: Record<ProfileOwnership, string> = {
  own_profile: "É o meu perfil pessoal",
  brand_profile: "É o perfil da minha marca",
  client_profile: "É o perfil de um cliente",
  competitor_research: "Estou a observar concorrência",
  curiosity: "Estou só a explorar",
};

export const GOAL_LABELS: Record<Goal, string> = {
  improve_content: "Melhorar o conteúdo",
  benchmark_competitors: "Comparar com concorrentes",
  client_report: "Preparar uma análise para um cliente",
  grow_audience: "Crescer a audiência",
  validate_brand: "Validar a presença da marca",
  other: "Outro",
};

export const USER_TYPE_LABELS: Record<UserType, string> = {
  creator: "Criador / Influencer",
  brand: "Marca",
  agency: "Agência",
  consultant: "Consultor / Freelancer",
  ecommerce: "E-commerce",
  student: "Estudante / Académico",
  other: "Outro",
};

export const PRICING_PREFERENCE_LABELS: Record<PricingPreference, string> = {
  under_3: "Até 3 € por relatório",
  under_9: "Até 9 € por relatório",
  under_19: "Até 19 € por relatório",
  free_only: "Só uso se for gratuito (mesmo para ver concorrência)",
  not_sure: "Ainda não sei",
};

export const unlockFormSchema = z
  .object({
    // Single "Primeiro e último nome" field — parsed into first/last via
    // `parseFullName` before submission. Min 2 chars after trim; does NOT
    // require two words (some users only enter a single name).
    full_name: z
      .string()
      .trim()
      .min(2, "Indica o teu nome (mínimo 2 caracteres)")
      .max(120, "Nome demasiado longo")
      .regex(/\S/, "Indica o teu nome"),
    email: z.string().trim().toLowerCase().email("Email inválido").max(255),
    // Qualification (Fase 5 modal). Optional at the shared-schema level so
    // legacy callers (old unlock flow, tests) still validate; the new
    // onboarding modal enforces it client-side and the server route
    // (`/api/onboarding/start`) requires it via its own Zod schema.
    qualification: z.enum(LEAD_QUALIFICATIONS).optional(),
    profile_ownership: z.enum(PROFILE_OWNERSHIPS, {
      required_error: "Escolhe uma opção",
    }),
    goal: z.enum(GOALS, { required_error: "Escolhe uma opção" }),
    user_type: z.enum(USER_TYPES, { required_error: "Escolhe uma opção" }),
    // Free-text only when "other" is picked (validated by the refinement below).
    goal_other_text: z.string().trim().max(80).optional(),
    user_type_other_text: z.string().trim().max(80).optional(),
    // GDPR consent is required to submit the form.
    gdpr_consent: z.literal(true, {
      errorMap: () => ({ message: "Tens de aceitar para continuar" }),
    }),
    // Optional marketing newsletter consent (separate from GDPR).
    marketing_consent: z.boolean().optional(),
    // Pricing preference is no longer asked in the unlock modal — moved to
    // a contextual sheet (post-value). Kept optional for backwards compat.
    pricing_preference: z.enum(PRICING_PREFERENCES).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.goal === "other" && (data.goal_other_text ?? "").length < 2) {
      ctx.addIssue({
        path: ["goal_other_text"],
        code: z.ZodIssueCode.custom,
        message: "Conta-nos brevemente (mínimo 2 caracteres)",
      });
    }
    if (
      data.user_type === "other" &&
      (data.user_type_other_text ?? "").length < 2
    ) {
      ctx.addIssue({
        path: ["user_type_other_text"],
        code: z.ZodIssueCode.custom,
        message: "Conta-nos brevemente (mínimo 2 caracteres)",
      });
    }
  });

export type UnlockFormValues = z.infer<typeof unlockFormSchema>;
