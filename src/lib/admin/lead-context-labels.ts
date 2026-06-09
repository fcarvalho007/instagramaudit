/**
 * Tradução PT (sentence case) de valores técnicos guardados em `leads` para
 * o ecrã de "Contexto do lead" da ficha de cliente. Centraliza aqui para
 * não voltar a deixar `own_profile`, `improve_content`, etc., vazar para o UI.
 */

export const PROFILE_OWNERSHIP_LABELS: Record<string, string> = {
  // Valores canónicos gravados pelo modal de onboarding (RELATIONSHIP_VALUES).
  // Mantemos os mesmos rótulos PT-PT que o lead vê em gate.json/step2.
  own_profile: "É o meu perfil pessoal",
  brand_profile: "É o perfil da minha marca",
  client_profile: "É o perfil de um cliente",
  competitor_research: "Estou a observar concorrência",
  curiosity: "Estou só a explorar",
  // Alias legados (compat com leads antigos)
  own: "É o meu perfil pessoal",
  mine: "É o perfil pessoal",
  client: "É o perfil de um cliente",
  competitor: "Estou a observar concorrência",
  competitor_profile: "Estou a observar concorrência",
  inspiration: "Perfil de inspiração",
  other: "Outro",
};

export const PURPOSE_LABELS: Record<string, string> = {
  // Valores canónicos gravados pelo modal (GOAL_VALUES) + extras do gate.json.
  improve_content: "Melhorar o conteúdo",
  benchmark_competitors: "Comparar com concorrentes",
  grow_audience: "Crescer a audiência",
  validate_brand: "Validar a presença da marca",
  client_report: "Preparar análise para cliente",
  // Alias legados
  understand_competition: "Comparar com concorrentes",
  benchmark: "Comparar com concorrentes",
  sell_to_client: "Preparar análise para cliente",
  pitch_client: "Preparar análise para cliente",
  win_client: "Ganhar cliente",
  validate_strategy: "Validar a presença da marca",
  curiosity: "Só a explorar",
  other: "Outro objetivo",
};

export const SOURCE_LABELS: Record<string, string> = {
  public_report_unlock: "Desbloqueio de relatório público",
  public_report_gate: "Gate de relatório público",
  onboarding_modal: "Modal de onboarding",
  onboarding: "Modal de onboarding",
  otp_claim: "Conta reentrou (OTP)",
  homepage: "Página inicial",
  beta_form: "Formulário beta",
  beta: "Formulário beta",
  qa: "QA interno",
  qa_manual: "QA manual",
  qa_smoke: "QA smoke test",
  admin: "Criado em admin",
  referral: "Indicação",
  organic: "Tráfego orgânico",
  email: "Email",
  unknown: "Origem desconhecida",
};

/**
 * Mapa derivado em `build-start-payload.ts` a partir do `profile_ownership`.
 * Os valores aqui têm de coincidir com o domínio de `LEAD_QUALIFICATIONS`.
 */
export const QUALIFICATION_LABELS: Record<string, string> = {
  brand_company: "Marca / empresa",
  consultant_agency: "Consultor / agência",
  marketing_comms: "Marketing / comunicação",
  content_creator: "Criador de conteúdo",
  curiosity: "Curiosidade",
};

export const EMAIL_DOMAIN_CLASS_LABELS: Record<string, string> = {
  corporate: "Email corporativo",
  personal: "Email pessoal",
  disposable: "Email descartável",
  unknown: "Domínio desconhecido",
};

export function labelProfileOwnership(value: string | null | undefined): string {
  if (!value) return "—";
  return PROFILE_OWNERSHIP_LABELS[value] ?? humanize(value);
}

export function labelPurpose(value: string | null | undefined): string {
  if (!value) return "—";
  return PURPOSE_LABELS[value] ?? humanize(value);
}

export function labelSource(value: string | null | undefined): string {
  if (!value) return "—";
  return SOURCE_LABELS[value] ?? humanize(value);
}

export function labelQualification(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  return QUALIFICATION_LABELS[value] ?? humanize(value);
}

export function labelEmailDomainClass(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  return EMAIL_DOMAIN_CLASS_LABELS[value] ?? humanize(value);
}

/** Fallback: snake_case → "Snake case". */
function humanize(value: string): string {
  const s = value.replace(/[_-]+/g, " ").trim();
  return s.length === 0 ? "—" : s.charAt(0).toUpperCase() + s.slice(1);
}