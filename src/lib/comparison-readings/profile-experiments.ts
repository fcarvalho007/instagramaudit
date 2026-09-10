import { CardReadingSchema, type CardReading } from "./types";
import { editorialEvidence } from "./editorial-evidence";
/** Conservative, source-backed experiments when no comparison is available. Never pads. */
export function buildProfileExperiments(payload: Record<string, unknown>): CardReading[] {
  const end = Date.parse(String(payload.analysis_window_end ?? ""));
  const evidence = editorialEvidence(payload.posts, null, Number.isFinite(end) ? end : null);
  if (evidence.aggregates.eligible_posts < 6) return [];
  const usable = evidence.sampled_posts.filter((p) => p.caption && p.permalink);
  if (usable.length < 2) return [];
  const sources = usable.slice(0, 2).map((p) => ({
    side: "primary" as const,
    post_id: p.id,
    quote: p.caption!.slice(0, 160),
    permalink: p.permalink,
    date: p.date,
  }));
  const noQuestions = usable.every((p) => !p.caption!.includes("?"));
  const cards: CardReading[] = [];
  if (noQuestions)
    cards.push({
      card_id: "engagement",
      headline: "Testar uma pergunta ligada ao tema",
      key_reading: "Não foram detetados pontos de interrogação nas legendas da amostra editorial.",
      evidence_points: [],
      sources,
      confidence: "low",
      caveats: [
        "A amostra editorial não demonstra a intenção do público nem ausência de perguntas no áudio ou na imagem.",
      ],
      recommendation: null,
      priority_rank: 1,
      experiment: {
        hypothesis: "Uma pergunta específica pode alterar a resposta pública.",
        execution:
          "Adaptar a abertura dos exemplos ao mesmo tema e acrescentar uma pergunta concreta, mantendo o formato.",
        effort: "baixo",
        duration_days: 14,
        intended_posts: 4,
        success_metric: "median_comments",
        evaluation:
          "Comparar a mediana de comentários com publicações anteriores equivalentes, medidas após o mesmo tempo de exposição. Registar alterações de tema e formato.",
      },
    });
  // This is explicitly a proposed experiment; the only observation is the verified source excerpt.
  if (!cards.length)
    cards.push({
      card_id: "top_posts",
      headline: "Testar outra abertura para o mesmo tema",
      key_reading: "Os excertos abaixo identificam as legendas que podem servir de base ao teste.",
      evidence_points: [],
      sources,
      confidence: "low",
      caveats: [
        "Diferenças de público, formato e tempo de exposição limitam a comparação dos resultados.",
      ],
      recommendation: null,
      priority_rank: 1,
      experiment: {
        hypothesis: "Uma abertura mais específica pode alterar os comentários recebidos.",
        execution:
          "Adaptar as primeiras frases dos exemplos, preservando tema e formato. Registar a versão utilizada em cada publicação.",
        effort: "baixo",
        duration_days: 14,
        intended_posts: 4,
        success_metric: "median_comments",
        evaluation:
          "Comparar a mediana de comentários com exemplos anteriores após o mesmo tempo de exposição, sem atribuir causalidade ao resultado.",
      },
    });
  return cards;
}
export function readProfileExperiments(payload: unknown): CardReading[] {
  const raw = (payload as Record<string, unknown> | null)?.profile_experiments_v2;
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 3).flatMap((value) => {
    const parsed = CardReadingSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
}
