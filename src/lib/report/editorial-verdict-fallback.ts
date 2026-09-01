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
  /**
   * Pre-built pt-PT cadence sentence (e.g. "cerca de 1 post por dia").
   * When present, takes precedence over the `cadenceMethod` qualifier and
   * is embedded verbatim as "Na amostra recente, o perfil publica {label}."
   */
  cadenceLabelPt?: string | null;
  /**
   * Diagnostic state derived from `top_hashtags`. When provided overrides
   * `hasRecurringHashtags`:
   *   - "recurring" → quote up to 2 tags as "Hashtags recorrentes: #a, #b."
   *   - "weak"      → "Uso pontual de hashtags, sem assinatura clara."
   *   - "absent"    → "Sem hashtags relevantes na amostra."
   */
  hashtagsState?: "recurring" | "weak" | "absent" | null;
  /** Tags (lowercased, sem `#`) usadas para construir a frase recorrente. */
  topHashtags?: ReadonlyArray<string> | null;
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

  // Os sinais de amostra (cadência real, hashtags recorrentes, médias)
  // deixaram de ser colados ao parágrafo: são renderizados numa linha
  // factual própria no cartão 1 ("prova de leitura"). O parágrafo fica
  // só com o diagnóstico curto.
  void qualifiers;
  const paragraph = baseParagraph;


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