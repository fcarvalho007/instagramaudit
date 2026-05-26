/**
 * Deterministic editorial verdict fallback.
 *
 * Constrói um `EditorialVerdict` puramente a partir de métricas + um
 * tradutor `t`. Usado em dois sítios:
 *   1. Como input do `deriveEditorialVerdict` (resolução vs IA).
 *   2. Como fallback final no `EditorialIdentityCard` quando a IA não
 *      passou na validação ou foi descartada por contradições.
 *
 * Reusa as chaves i18n já existentes em `identity.fallback.*` (PT + EN)
 * para evitar duplicação editorial.
 */

import type { TFunction } from "i18next";
import type {
  EditorialVerdict,
  EditorialVerdictBand,
} from "@/lib/insights/types";
import type { EditorialVerdictMetrics } from "./editorial-verdict";

/**
 * Optional extra qualifiers propagated from the snapshot to make the
 * deterministic fallback more concrete:
 *   - cadence method + window → "nos últimos 30 dias" / "na amostra recente"
 *   - has_recurring_hashtags === false → "Sem hashtags recorrentes na amostra."
 * All optional and additive — old snapshots without these fields render
 * exactly as before.
 */
export interface FallbackQualifiers {
  cadenceMethod?:
    | "window_30d"
    | "window_90d"
    | "sample_span"
    | "insufficient"
    | null;
  cadenceWindowDays?: number | null;
  hasRecurringHashtags?: boolean | null;
}

type FallbackKey =
  | "solid_consistent"
  | "irregular_reach"
  | "cadence_no_signal"
  | "no_direction"
  | "attention_no_conversation"
  | "opportunity";

function pickKey(m: EditorialVerdictMetrics): {
  key: FallbackKey;
  band: EditorialVerdictBand;
} {
  const bench = m.benchmarkEngagementPct ?? 0;
  const engRatio = bench > 0 ? m.engagementPct / bench : 1;
  const ppw = m.postsPerWeek30d ?? 0;

  if (m.postsAnalyzed < 4) {
    return { key: "opportunity", band: "limited_data" };
  }
  // Atenção sem conversa: likes saudáveis face ao benchmark mas
  // comentários quase nulos. Sinal típico de consumo passivo.
  if (engRatio >= 0.9 && m.avgComments < 2) {
    return { key: "attention_no_conversation", band: "promising" };
  }
  if (engRatio >= 1 && ppw >= 2.5) {
    return { key: "solid_consistent", band: "strong" };
  }
  if (engRatio >= 1 && ppw < 1) {
    return { key: "irregular_reach", band: "promising" };
  }
  if (ppw >= 2.5 && engRatio < 0.7) {
    return { key: "cadence_no_signal", band: "needs_work" };
  }
  if (engRatio < 0.7 && m.avgComments < 2) {
    return { key: "no_direction", band: "needs_work" };
  }
  return { key: "opportunity", band: "promising" };
}

/**
 * Constrói um `EditorialVerdict` mínimo a partir das métricas. Os
 * `strengths` / `limitations` reutilizam rótulos curtos das chaves
 * `identity.signals.fallback_*` para preservar a coerência editorial.
 */
export function buildFallbackVerdict(
  metrics: EditorialVerdictMetrics,
  t: TFunction,
  qualifiers: FallbackQualifiers = {},
): EditorialVerdict {
  const { key, band } = pickKey(metrics);

  const title = t(`identity.fallback.${key}.title`);
  const baseParagraph = t(`identity.fallback.${key}.paragraph`);

  const qualifierSentences: string[] = [];
  if (qualifiers.cadenceMethod && qualifiers.cadenceMethod !== "insufficient") {
    const qKey = qualifiers.cadenceMethod;
    const sentence = t(`identity.fallback_cadence_qualifier.${qKey}`, {
      defaultValue: "",
    });
    if (sentence) qualifierSentences.push(sentence);
  }
  if (qualifiers.hasRecurringHashtags === false) {
    const sentence = t("identity.fallback_hashtags_absent", {
      defaultValue: "",
    });
    if (sentence) qualifierSentences.push(sentence);
  }
  const paragraph =
    qualifierSentences.length > 0
      ? `${baseParagraph}\n\n${qualifierSentences.join(" ")}`
      : baseParagraph;

  // Prioridade prática derivada do band (1 frase no infinitivo).
  const priority = t(`identity.fallback_priority.${band}`, {
    defaultValue:
      band === "strong"
        ? "Manter o ritmo e diversificar formatos para abrir nova conversa."
        : band === "promising"
          ? "Reforçar regularidade editorial e testar formatos durante 30 dias."
          : band === "needs_work"
            ? "Rever ângulo editorial e clarificar o pedido de interação em cada post."
            : "Reunir amostra maior antes de tirar conclusões definitivas.",
  });

  // 2 strengths + 2 limitations a partir das chaves já presentes.
  const strengths: [string, string] = [
    t("identity.signals.fallback_active.title"),
    t("identity.signals.fallback_history.title"),
  ];
  const limitations: [string, string] = [
    t("identity.signals.fallback_diversify.title"),
    t("identity.signals.fallback_conversation.title"),
  ];

  return {
    verdict_label: band,
    title,
    paragraph,
    priority,
    strengths,
    limitations,
    confidence: "low",
    evidence_used: [],
  };
}