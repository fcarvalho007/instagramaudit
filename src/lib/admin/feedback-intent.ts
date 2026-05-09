/**
 * Pure interpretation of beta feedback into commercial intent + next action.
 * No side effects. Safe for client and server.
 */

import type { BetaFeedbackSummary } from "./kanban-columns";

export type FeedbackIntent = "alto" | "medio" | "baixo" | "sem";

export interface FeedbackIntentResult {
  intent: FeedbackIntent;
  label: string;
  accent: "revenue" | "signal" | "neutral" | "expense";
  nextAction: string;
}

const INTENT_LABEL: Record<FeedbackIntent, string> = {
  alto: "Intenção alta",
  medio: "Intenção média",
  baixo: "Intenção baixa",
  sem: "Sem intenção",
};

const INTENT_ACCENT: Record<FeedbackIntent, FeedbackIntentResult["accent"]> = {
  alto: "revenue",
  medio: "signal",
  baixo: "neutral",
  sem: "expense",
};

function actionByPricing(
  pricing: string | null | undefined,
  fallback: string,
): string {
  switch (pricing) {
    case "one_off_3":
      return "Responder com proposta de relatório único";
    case "bundle_5_13":
      return "Sugerir bundle 5";
    case "plano_mensal":
    case "plano_agencia":
      return "Explorar plano mensal";
    default:
      return fallback;
  }
}

export function interpretFeedback(
  fb: BetaFeedbackSummary | null | undefined,
): FeedbackIntentResult {
  if (!fb) {
    return {
      intent: "sem",
      label: INTENT_LABEL.sem,
      accent: INTENT_ACCENT.sem,
      nextAction: "Sem feedback ainda",
    };
  }

  const score = fb.usefulness_score ?? 0;
  const intentField = fb.purchase_intent;
  const consent = !!fb.contact_consent;

  let intent: FeedbackIntent;
  if (intentField === "nao" || score <= 2) {
    intent = "sem";
  } else if (intentField === "sim" && consent && score >= 4) {
    intent = "alto";
  } else if (intentField === "sim" || (intentField === "talvez" && score >= 4 && consent)) {
    intent = "medio";
  } else {
    intent = "baixo";
  }

  const fallback =
    intent === "alto"
      ? "Responder com proposta de relatório único"
      : intent === "medio"
        ? "Explorar plano mensal"
        : intent === "baixo"
          ? "Nutrir mais tarde"
          : "Arquivar / nutrir mais tarde";

  const nextAction =
    intent === "sem"
      ? "Arquivar / nutrir mais tarde"
      : actionByPricing(fb.pricing_preference, fallback);

  return {
    intent,
    label: INTENT_LABEL[intent],
    accent: INTENT_ACCENT[intent],
    nextAction,
  };
}