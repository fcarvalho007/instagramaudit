import { ComparisonAIReadingsSchema, type ComparisonAIReadings, type CardReading } from "./types";
import type { ComparisonEvidencePack, ProfileEvidence } from "./build-evidence";

/** Explicit metric registry. Units and identity are resolved by the server, never inferred from prose. */
export const COMPARISON_METRICS: Record<string, { label: string; unit: string }> = {
  followers: { label: "Seguidores", unit: "" },
  posts_analyzed: { label: "Publicações analisadas", unit: "" },
  engagement_rate_pct: { label: "Envolvimento médio por seguidores", unit: "%" },
  posting_frequency_weekly: { label: "Ritmo observado", unit: "/semana" },
  average_likes: { label: "Gostos médios", unit: "" },
  average_comments: { label: "Comentários médios", unit: "" },
  dominant_format: { label: "Formato dominante", unit: "" },
  dominant_format_share_pct: { label: "Peso do formato dominante", unit: "%" },
  bio_external_url_count: { label: "Ligações na bio", unit: "" },
  "aggregates.eligible_posts": { label: "Publicações elegíveis", unit: "" },
  "aggregates.measured_posts": { label: "Publicações com métricas", unit: "" },
  "aggregates.median_likes": { label: "Mediana de gostos", unit: "" },
  "aggregates.median_comments": { label: "Mediana de comentários", unit: "" },
  "aggregates.median_engagement_pct": {
    label: "Mediana de envolvimento por seguidores",
    unit: "%",
  },
  "aggregates.top_three_interaction_share_pct": {
    label: "Interações concentradas nas três publicações principais",
    unit: "%",
  },
};
export function metricValue(profile: ProfileEvidence, field: string): string | number | null {
  if (!Object.hasOwn(COMPARISON_METRICS, field)) return null;
  let value: unknown = profile;
  for (const key of field.split("."))
    value = value && typeof value === "object" ? (value as Record<string, unknown>)[key] : null;
  return (typeof value === "number" && Number.isFinite(value)) || typeof value === "string"
    ? (value as number | string)
    : null;
}
const TEMPLATE = /\{\{(primary|competitor)\.([a-z_.]+)\}\}/g;
const FORBIDDEN =
  /(?:garant(?:e|ir)|causa(?:r|m)?|comprov(?:a|ado)|aumentou\s+as\s+vendas|baixo\s+alcance|retenção\s+(?:alta|baixa)|ignore\s+(?:all|previous|as)|system\s*prompt|https?:\/\/|<\/?script)/i;
/** Factual numbers MUST be typed placeholders. Experiment parameters live in a separate object. */
function renderText(
  text: string,
  pack: ComparisonEvidencePack,
  fields: Set<string>,
): string | null {
  if (FORBIDDEN.test(text) || /\d/.test(text.replace(TEMPLATE, ""))) return null;
  let invalid = false;
  const out = text.replace(TEMPLATE, (_match, side: "primary" | "competitor", field: string) => {
    const value = metricValue(pack[side], field);
    if (value === null || !fields.has(field)) {
      invalid = true;
      return "";
    }
    return typeof value === "number"
      ? `${new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(value)}${COMPARISON_METRICS[field].unit}`
      : value;
  });
  return invalid || /\{\{|\}\}/.test(out) ? null : out;
}
const TITLES: Record<string, string> = {
  overview: "Diferenças observadas entre os perfis",
  engagement: "Envolvimento observado",
  cadence: "Cadência observada",
  weekday_rhythm: "Distribuição semanal observada",
  format_mix: "Formatos na amostra",
  bio_conversion: "Posicionamento e chamadas à ação",
  top_posts: "Publicações que sustentam a leitura",
};
function observedText(card: CardReading): string {
  const format = (field: string, value: number | string | null) =>
    value === null
      ? "indisponível"
      : typeof value === "number"
        ? new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(value) +
          COMPARISON_METRICS[field].unit
        : value;
  return (
    card.evidence_points
      .slice(0, 3)
      .map(
        (e) =>
          `${COMPARISON_METRICS[e.field].label}: perfil ${format(e.field, e.primary_value)}; conta comparada ${format(e.field, e.competitor_value)}.`,
      )
      .join(" ") || "Os excertos identificam as publicações consideradas nesta leitura."
  );
}
export function validateComparisonReadings(
  raw: unknown,
  pack: ComparisonEvidencePack,
):
  | { ok: true; readings: ComparisonAIReadings; rejectedCards: number }
  | { ok: false; reason: string } {
  const parsed = ComparisonAIReadingsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, reason: "schema_invalid" };
  const cards: CardReading[] = [];
  const seen = new Set<string>();
  for (const card of parsed.data.cards) {
    if (seen.has(card.card_id)) continue;
    const fields = new Set(card.evidence_points.map((e) => e.field));
    if (!fields.size && !card.sources.length) continue;
    if (
      card.evidence_points.some(
        (e) =>
          !Object.hasOwn(COMPARISON_METRICS, e.field) ||
          e.primary_value !== metricValue(pack.primary, e.field) ||
          e.competitor_value !== metricValue(pack.competitor, e.field) ||
          (e.primary_value === null && e.competitor_value === null),
      )
    )
      continue;
    let badSource = false;
    const sources = card.sources.flatMap((source) => {
      const post = pack[source.side].sampled_posts.find((p) => p.id === source.post_id);
      if (!post?.caption?.includes(source.quote)) {
        badSource = true;
        return [];
      }
      return [{ ...source, permalink: post.permalink, date: post.date }];
    });
    if (badSource) continue;
    const headline = renderText(card.headline, pack, fields),
      key = renderText(card.key_reading, pack, fields);
    const recommendation =
      card.recommendation === null ? null : renderText(card.recommendation, pack, fields);
    const caveats = card.caveats.map((t) => renderText(t, pack, fields));
    if (
      headline === null ||
      key === null ||
      (card.recommendation !== null && recommendation === null) ||
      caveats.some((v) => v === null)
    )
      continue;
    if (
      card.diagnosis &&
      Object.values(card.diagnosis).some((t) => renderText(t, pack, fields) === null)
    )
      continue;
    if (
      card.experiment &&
      [card.experiment.hypothesis, card.experiment.execution, card.experiment.evaluation].some(
        (t) => FORBIDDEN.test(t) || /\d/.test(t),
      )
    )
      continue;
    const limited =
      !pack.flags.comparable_periods ||
      pack.flags.primary_sample_small ||
      pack.flags.competitor_sample_small;
    const hydrated: CardReading = {
      ...card,
      headline: TITLES[card.card_id],
      key_reading: observedText(card),
      recommendation,
      evidence_points: card.evidence_points.map((e) => ({
        ...e,
        label: COMPARISON_METRICS[e.field].label,
      })),
      sources,
      caveats: caveats as string[],
      confidence: limited ? "low" : card.confidence,
      diagnosis: card.diagnosis
        ? {
            pattern: observedText(card).slice(0, 400),
            interpretation: renderText(card.diagnosis.interpretation, pack, fields)!,
            transferability: renderText(card.diagnosis.transferability, pack, fields)!,
          }
        : undefined,
    };
    if (limited) {
      hydrated.caveats.push(
        "Amostras pequenas ou cobertura temporal não equivalente; a comparação descreve apenas os dados observados.",
      );
      hydrated.recommendation = null;
      hydrated.experiment = null;
      hydrated.priority_rank = null;
    }
    hydrated.caveats = hydrated.caveats.slice(-6);
    seen.add(card.card_id);
    cards.push(hydrated);
  }
  // At most three experiments, ranked once; never pad an insufficient diagnosis.
  const experimentKeys = new Set<string>();
  const ranked = cards
    .filter((c) => {
      if (!c.experiment || !c.sources.length || !c.priority_rank) return false;
      const key = c.experiment.execution.trim().toLowerCase();
      if (experimentKeys.has(key)) return false;
      experimentKeys.add(key);
      return true;
    })
    .sort((a, b) => a.priority_rank! - b.priority_rank!)
    .slice(0, 3);
  for (const c of cards)
    if (!ranked.includes(c)) {
      c.experiment = null;
      c.priority_rank = null;
    }
  ranked.forEach((c, i) => (c.priority_rank = i + 1));
  const allFields = new Set(cards.flatMap((c) => c.evidence_points.map((e) => e.field)));
  const headline = renderText(parsed.data.global_summary.headline, pack, allFields);
  const key = renderText(parsed.data.global_summary.key_reading, pack, allFields);
  if (!cards.length || headline === null || key === null)
    return { ok: false, reason: "unsupported_evidence" };
  return {
    ok: true,
    rejectedCards: parsed.data.cards.length - cards.length,
    readings: {
      ...parsed.data,
      cards,
      global_summary: {
        headline: "Comparação sustentada em dados observados",
        key_reading:
          "As evidências descrevem as contas recolhidas. As interpretações e os testes propostos devem ser avaliados à luz da cobertura e do contexto.",
        confidence: cards.some((c) => c.confidence === "low")
          ? "low"
          : parsed.data.global_summary.confidence,
      },
    },
  };
}
