/**
 * Shared constants for the "context" qualification select used in the
 * onboarding modal final step. Stored on `leads.qualification`.
 *
 * Values are stable identifiers; PT-PT labels live next to them so admin
 * and modal pull from a single source of truth.
 */
export const LEAD_QUALIFICATIONS = [
  "brand_company",
  "marketing_comms",
  "consultant_agency",
  "content_creator",
  "curiosity",
  "other",
] as const;

export type LeadQualification = (typeof LEAD_QUALIFICATIONS)[number];

export const LEAD_QUALIFICATION_LABELS_PT: Record<LeadQualification, string> = {
  brand_company: "Tenho uma marca/empresa",
  marketing_comms: "Trabalho em marketing/comunicação",
  consultant_agency: "Sou consultor/agência",
  content_creator: "Sou criador de conteúdo",
  curiosity: "Estou a explorar por curiosidade",
  other: "Outro",
};

export function isLeadQualification(v: unknown): v is LeadQualification {
  return (
    typeof v === "string" &&
    (LEAD_QUALIFICATIONS as readonly string[]).includes(v)
  );
}