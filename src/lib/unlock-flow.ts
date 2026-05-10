/**
 * Client-safe enums + Zod schema for the public report unlock flow.
 *
 * The server module `unlock.server.ts` is import-protected; we mirror its
 * tuples here and assert parity in `unlock-flow.test.ts`.
 */
import { z } from "zod";

export const PROFILE_OWNERSHIPS = [
  "own_profile",
  "brand_profile",
  "client_profile",
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
};

export const GOAL_LABELS: Record<Goal, string> = {
  improve_content: "Melhorar o conteúdo",
  benchmark_competitors: "Comparar com concorrentes",
  client_report: "Apresentar a um cliente",
  grow_audience: "Crescer audiência",
  validate_brand: "Validar a presença da marca",
  other: "Outro",
};

export const USER_TYPE_LABELS: Record<UserType, string> = {
  creator: "Criador / Influencer",
  brand: "Marca",
  agency: "Agência",
  consultant: "Consultor / Freelancer",
  ecommerce: "E-commerce",
  other: "Outro",
};

export const PRICING_PREFERENCE_LABELS: Record<PricingPreference, string> = {
  under_3: "Até 3 € por relatório",
  under_9: "Até 9 € por relatório",
  under_19: "Até 19 € por relatório",
  free_only: "Só uso se for gratuito (mesmo para ver concorrência)",
  not_sure: "Ainda não sei",
};

export const unlockFormSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido").max(255),
  profile_ownership: z.enum(PROFILE_OWNERSHIPS, {
    required_error: "Escolhe uma opção",
  }),
  goal: z.enum(GOALS, { required_error: "Escolhe uma opção" }),
  user_type: z.enum(USER_TYPES, { required_error: "Escolhe uma opção" }),
  // Pricing preference is no longer asked in the unlock modal — moved to
  // a contextual sheet (post-value). Kept optional for backwards compat.
  pricing_preference: z.enum(PRICING_PREFERENCES).optional(),
});

export type UnlockFormValues = z.infer<typeof unlockFormSchema>;
