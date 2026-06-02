/**
 * Classificação partilhada de leads (Contactos).
 *
 * Fonte única de verdade para:
 *  - `isQaLead` — leads internos/teste a esconder por defeito
 *  - `isHotLead` — leads que viram o relatório mas não deram feedback
 *  - `suggestedAction` — acção contextual sugerida na tabela
 *  - `priorityScore` — ordenação descendente "quem precisa de acção primeiro"
 *
 * Usado hoje por `LeadsTable`. Pensado para ser também a base das contagens
 * "precisam de acção" em /admin/visão-geral, para que tabela e dashboard
 * contem a mesma coisa.
 */

import type { EnrichedLead } from "./kanban-columns";

const HOT_LEAD_MIN_AGE_HOURS = 48;

/** Emails de QA conhecidos (lowercase). Editar aqui — não no UI. */
export const QA_EMAIL_ALLOWLIST: ReadonlySet<string> = new Set<string>([
  // adicionar emails de QA aqui conforme necessário
]);

/** Padrões de email QA (substring lowercase). */
const QA_EMAIL_PATTERNS = ["+qa@", "qa.audit", "qaaudit", "qa-audit"];

function hoursBetween(now: number, iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (now - t) / 36e5);
}

/**
 * Lead de QA / teste interno. Critério defensivo (any match):
 *  - source começa por `qa` (ex.: `qa`, `qa_manual`, `qa_smoke`)
 *  - email em allowlist explícita
 *  - email contém padrões `+qa@` / `qa.audit` / `qaaudit` / `qa-audit`
 *  - nome contém a palavra "QA" (case-insensitive, palavra inteira)
 */
export function isQaLead(
  lead: Pick<EnrichedLead, "source" | "email" | "name">,
): boolean {
  const src = (lead.source ?? "").toLowerCase();
  if (src === "qa" || src.startsWith("qa_") || src.startsWith("qa-")) {
    return true;
  }
  const email = (lead.email ?? "").toLowerCase();
  if (email && QA_EMAIL_ALLOWLIST.has(email)) return true;
  if (email && QA_EMAIL_PATTERNS.some((p) => email.includes(p))) return true;
  const name = (lead.name ?? "").trim();
  if (name && /\bQA\b/i.test(name)) return true;
  return false;
}

/**
 * "Lead quente": viu o relatório, ainda não respondeu feedback e a última
 * interacção foi há ≥ 48h. Reutiliza a mesma intuição das regras de
 * `/api/admin/follow-ups` (feedback_nao_respondido / link já visto).
 */
export function isHotLead(
  lead: Pick<EnrichedLead, "report_views" | "feedback" | "last_interaction">,
  now: number = Date.now(),
): boolean {
  if ((lead.report_views ?? 0) <= 0) return false;
  if (lead.feedback) return false;
  return hoursBetween(now, lead.last_interaction) >= HOT_LEAD_MIN_AGE_HOURS;
}

export type SuggestedActionKey = "oferecer_pack" | "pedir_feedback" | "ver";

export interface SuggestedAction {
  key: SuggestedActionKey;
  label: string;
  /** Intensidade visual sugerida para o botão na tabela. */
  intent: "primary" | "signal" | "ghost";
}

/**
 * Acção sugerida — prioriza crédito esgotado sobre lead quente.
 * Só sugere "oferecer pack" quando houve concessão inicial (granted>0) para
 * não tratar leads sem créditos atribuídos como "esgotados".
 */
export function suggestedAction(
  lead: Pick<
    EnrichedLead,
    | "report_views"
    | "feedback"
    | "last_interaction"
    | "credits_remaining"
    | "credits_granted"
  >,
  now: number = Date.now(),
): SuggestedAction {
  if (
    (lead.credits_granted ?? 0) > 0 &&
    (lead.credits_remaining ?? 0) <= 0
  ) {
    return { key: "oferecer_pack", label: "Oferecer pack", intent: "primary" };
  }
  if (isHotLead(lead, now)) {
    return { key: "pedir_feedback", label: "Pedir feedback", intent: "signal" };
  }
  return { key: "ver", label: "Ver", intent: "ghost" };
}

/**
 * Score de prioridade (maior = mais urgente). Ordenação descendente.
 * Desempate por `last_interaction` mais recente.
 */
export function priorityScore(
  lead: Pick<
    EnrichedLead,
    | "report_views"
    | "feedback"
    | "last_interaction"
    | "credits_remaining"
    | "credits_granted"
    | "created_at"
  >,
  now: number = Date.now(),
): number {
  if ((lead.credits_granted ?? 0) > 0 && (lead.credits_remaining ?? 0) <= 0) {
    return 3;
  }
  if (isHotLead(lead, now)) return 2;
  if (hoursBetween(now, lead.created_at) < 24) return 1;
  return 0;
}

/** Idade legível (h/d) — mesmo formato do priority-followups. */
export function formatAgeShort(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return "—";
  const hours = hoursBetween(now, iso);
  if (!Number.isFinite(hours)) return "—";
  if (hours < 1) return "<1h";
  if (hours < 72) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d`;
}