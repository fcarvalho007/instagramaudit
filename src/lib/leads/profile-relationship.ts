/**
 * Relação declarada entre o lead e o perfil de Instagram analisado.
 *
 * Ao contrário de `leads.profile_ownership` (que é ao nível do lead e fica
 * congelado no primeiro registo), esta relação é guardada por relatório em
 * `lead_reports.profile_relationship`, porque a mesma pessoa pode analisar
 * a sua conta, a de um cliente e a de um concorrente.
 */
import type { LeadQualification } from "@/lib/leads/qualification";

export const PROFILE_RELATIONSHIPS = [
  "owner",
  "manages",
  "client",
  "competitor",
  "research",
] as const;

export type ProfileRelationship = (typeof PROFILE_RELATIONSHIPS)[number];

export const PROFILE_RELATIONSHIP_LABELS_PT: Record<
  ProfileRelationship,
  string
> = {
  owner: "É a minha conta",
  manages: "Trabalho com esta conta",
  client: "É de um cliente",
  competitor: "É um concorrente",
  research: "Estou apenas a explorar",
};

export const PROFILE_RELATIONSHIP_LABELS_EN: Record<
  ProfileRelationship,
  string
> = {
  owner: "It's my account",
  manages: "I work with this account",
  client: "It belongs to a client",
  competitor: "It's a competitor",
  research: "Just exploring",
};

/**
 * Mapa para o CRM. O Kanban e a segmentação continuam a indexar em
 * `leads.qualification`; derivamos a partir da relação declarada em vez de
 * pedir uma segunda pergunta ao utilizador.
 */
export const RELATIONSHIP_TO_QUALIFICATION: Record<
  ProfileRelationship,
  LeadQualification
> = {
  owner: "content_creator",
  manages: "marketing_comms",
  client: "consultant_agency",
  competitor: "brand_company",
  research: "curiosity",
};

export function isProfileRelationship(v: unknown): v is ProfileRelationship {
  return (
    typeof v === "string" &&
    (PROFILE_RELATIONSHIPS as readonly string[]).includes(v)
  );
}
