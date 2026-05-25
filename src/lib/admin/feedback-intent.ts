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
    case "single_report_7":
      return "Responder com proposta de relatório único";
    case "pack_5_reports_28":
      return "Sugerir pack de 5 relatórios";
    case "not_ready_to_pay":
      return "Nutrir mais tarde";
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
        ? "Sugerir pack de 5 relatórios"
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