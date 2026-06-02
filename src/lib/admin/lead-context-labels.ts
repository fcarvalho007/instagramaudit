/**
 * Tradução PT (sentence case) de valores técnicos guardados em `leads` para
 * o ecrã de "Contexto do lead" da ficha de cliente. Centraliza aqui para
 * não voltar a deixar `own_profile`, `improve_content`, etc., vazar para o UI.
 */

export const PROFILE_OWNERSHIP_LABELS: Record<string, string> = {
  own_profile: "É o perfil dele",
  own: "É o perfil dele",
  mine: "É o perfil dele",
  client: "É de um cliente",
  client_profile: "É de um cliente",
  competitor: "É um concorrente",
  competitor_profile: "É um concorrente",
  inspiration: "Perfil de inspiração",
  other: "Outro",
};

export const PURPOSE_LABELS: Record<string, string> = {
  improve_content: "Melhorar conteúdo",
  understand_competition: "Estudar concorrência",
  benchmark: "Fazer benchmark",
  sell_to_client: "Vender a cliente",
  pitch_client: "Vender a cliente",
  win_client: "Ganhar cliente",
  grow_audience: "Crescer audiência",
  validate_strategy: "Validar estratégia",
  curiosity: "Só curiosidade",
  other: "Outro objetivo",
};

export const SOURCE_LABELS: Record<string, string> = {
  onboarding_modal: "Modal de onboarding",
  onboarding: "Modal de onboarding",
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

/** Fallback: snake_case → "Snake case". */
function humanize(value: string): string {
  const s = value.replace(/[_-]+/g, " ").trim();
  return s.length === 0 ? "—" : s.charAt(0).toUpperCase() + s.slice(1);
}