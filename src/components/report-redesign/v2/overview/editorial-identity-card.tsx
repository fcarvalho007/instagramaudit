/**
 * Editorial Identity Card — Veredicto executivo (Block 1)
 *
 * Layout:
 *   Zona macro      | gauge + eyebrow VEREDICTO + badge + título + síntese + barra de referência
 *   MetricsStrip    | 3 blocos: média de likes, média de comentários, frequência semanal
 *   Zona accionável | duas colunas: "O QUE JÁ FUNCIONA" (success) / "O QUE LIMITA O CRESCIMENTO" (warning)
 */
import { cn } from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Heart,
  Info,
  MessageCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { formatCompactNumber } from "@/lib/i18n/format";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { ScoreKey } from "./score-utils";
import { computeGlobalScore } from "./score-utils";
import type { EditorialVerdict } from "@/lib/insights/types";
import {
  deriveEditorialVerdict,
  type EditorialVerdictMetrics,
} from "@/lib/report/editorial-verdict";
import { buildFallbackVerdict } from "@/lib/report/editorial-verdict-fallback";

/* ── Types ─────────────────────────────────────────────────────────── */

type Band = "warning" | "developing" | "solid";
type Tone = "success" | "warning";

interface Bullet {
  destaque: string;
  detalhe: string;
}

interface EditorialIdentityCardProps {
  scores: Record<ScoreKey, { value: number; subtitle: string }>;
  /** Veredicto editorial estruturado. Quando presente, tem prioridade
   *  sobre o fallback determinístico. */
  aiVerdict?: EditorialVerdict | null;
  keyMetrics?: {
    engagementRate: number;
    engagementBenchmark: number;
    engagementDeltaPct: number;
  };
  dominantFormat?: "Reels" | "Carousels" | "Imagens" | string;
  dominantFormatShare?: number;
  postingFrequencyWeekly?: number;
  followers?: number;
  postsAnalyzed?: number;
  averageLikes?: number;
  averageComments?: number;
  /** Cadência considerada suficiente pelo módulo de cadence. Usado pelo
   *  guard determinístico para rejeitar veredictos que contradigam o ritmo. */
  cadenceSufficient?: boolean;
  /** Fiabilidade do cálculo de cadência ("high" | "medium" | "low"). Quando
   *  "low" o guard rejeita qualquer afirmação positiva sobre o ritmo. */
  cadenceReliability?: "high" | "medium" | "low";
  /** Quantidade de concorrentes com dados reais. Usado pelo guard para
   *  rejeitar menções a concorrentes inexistentes. */
  competitorsCount?: number;
  /** Método de cadência (window_30d / window_90d / sample_span / insufficient).
   *  Propagado para o fallback para gerar o sufixo "nos últimos 30 dias" etc. */
  cadenceMethod?:
    | "window_30d"
    | "window_90d"
    | "sample_span"
    | "insufficient"
    | null;
  cadenceWindowDays?: number | null;
  /** Verdadeiro quando pelo menos uma hashtag aparece em >= 2 publicações.
   *  `false` injecta "Sem hashtags recorrentes na amostra." no fallback. */
  hasRecurringHashtags?: boolean | null;
  /** Frase humana em pt-PT que descreve a cadência (e.g. "cerca de 1
   *  post a cada 2–3 dias"). Quando presente, embebida no fallback. */
  cadenceLabelPt?: string | null;
  /** Estado diagnóstico das hashtags (recurring/weak/absent). Tem
   *  prioridade sobre `hasRecurringHashtags` quando presente. */
  hashtagsState?: "recurring" | "weak" | "absent" | null;
  /** Tags top a citar quando `hashtagsState === "recurring"`. */
  topHashtags?: ReadonlyArray<string> | null;
}

interface EditorialCopy {
  title: string;
  paragraph: string;
}

/* ── Pontuação + bandas ────────────────────────────────────────────── */

/**
 * Índice agregado do perfil. Usa `computeGlobalScore` de `score-utils` para
 * garantir consistência com os scores individuais documentados nos tooltips
 * (pesos actuais: envolvimento 60%, cadência 40%). O sub-score de
 * interacção foi removido — estava efectivamente constante em 25 por
 * falta de um benchmark fiável de comentários por escalão.
 */
function computeOverall(
  scores: Record<ScoreKey, { value: number; subtitle: string }>,
): number {
  const raw = computeGlobalScore(
    scores.envolvimento.value,
    scores.frequencia.value,
  );
  return Math.max(0, Math.min(100, raw));
}

function verdictLabelToBand(label: EditorialVerdict["verdict_label"]): Band {
  if (label === "strong") return "solid";
  if (label === "promising") return "developing";
  return "warning"; // needs_work | limited_data
}

/* ── Helpers numéricos ─────────────────────────────────────────────── */

function formatDecimal(value: number, locale: string, digits = 1): string {
  const sep = locale.startsWith("pt") ? "," : ".";
  return value.toFixed(digits).replace(".", sep);
}

/**
 * Format an average metric (likes/post, comments/post) consistently with
 * Bloco 2 (`formatAvg` in report-diagnostic-card.tsx): keeps 1 decimal when
 * < 10 so 0,4 doesn't get rounded to 0; compacts when >= 10.
 */
function formatAvgMetric(value: number, lang: "en" | "pt"): string {
  if (value === 0) return "0";
  if (value > 0 && value < 0.1) return "<0,1";
  if (value < 10) {
    const locale = lang.startsWith("pt") ? "pt-PT" : "en-US";
    return value.toLocaleString(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }
  return formatCompactNumber(Math.round(value), lang);
}

function tierLabelFromFollowers(followers: number): string {
  if (followers >= 1_000_000) return "Mega";
  if (followers >= 250_000) return "Macro";
  if (followers >= 50_000) return "Mid";
  if (followers >= 10_000) return "Micro";
  return "Nano";
}

function tierRangeFromFollowers(followers: number): string {
  if (followers >= 1_000_000) return "1M+";
  if (followers >= 250_000) return "250K–1M";
  if (followers >= 50_000) return "50K–250K";
  if (followers >= 10_000) return "10K–50K";
  return "<10K";
}

function formatNameSingular(fmt: string | undefined, t: TFunction): string {
  if (!fmt) return t("identity.format_singular.default");
  const known = ["Reels", "Carousels", "Imagens", "Video"] as const;
  if ((known as readonly string[]).includes(fmt)) {
    return t(`identity.format_singular.${fmt}`);
  }
  return fmt.toLowerCase();
}

/* ── Bullets: strengths / limits ───────────────────────────────────── */

interface DerivedSignals {
  strengths: Bullet[];
  limits: Bullet[];
}

export function deriveSignals(
  scores: Record<ScoreKey, { value: number; subtitle: string }>,
  keyMetrics: EditorialIdentityCardProps["keyMetrics"],
  dominantFormat: string | undefined,
  dominantFormatShare: number | undefined,
  postingFrequencyWeekly: number | undefined,
  followers: number | undefined,
  t: TFunction,
  language: string,
): DerivedSignals {
  const strengths: Bullet[] = [];
  const limits: Bullet[] = [];

  const ppw = typeof postingFrequencyWeekly === "number" ? postingFrequencyWeekly : null;
  if (ppw !== null) {
    if (ppw >= 3 && ppw <= 7) {
      const sep = language.startsWith("pt") ? "," : ".";
      const perDay = (ppw / 7).toFixed(1).replace(".", sep);
      strengths.push({
        destaque: t("identity.signals.freq_consistent.title"),
        detalhe: t("identity.signals.freq_consistent.detail", { perDay }),
      });
    } else if (ppw < 1) {
      limits.push({
        destaque: t("identity.signals.freq_weak.title"),
        detalhe: t("identity.signals.freq_weak.detail"),
      });
    } else if (ppw > 7) {
      limits.push({
        destaque: t("identity.signals.freq_excess.title"),
        detalhe: t("identity.signals.freq_excess.detail"),
      });
    }
  }

  if (typeof followers === "number" && followers > 0) {
    const tier = tierLabelFromFollowers(followers);
    if (tier !== "Nano") {
      strengths.push({
        destaque: t("identity.signals.audience_relevant.title"),
        detalhe: t("identity.signals.audience_relevant.detail"),
      });
    } else if (followers < 2_000) {
      limits.push({
        destaque: t("identity.signals.audience_small.title"),
        detalhe: t("identity.signals.audience_small.detail"),
      });
    }
  }

  if (keyMetrics && keyMetrics.engagementBenchmark > 0) {
    const delta = keyMetrics.engagementDeltaPct;
    if (delta >= 10) {
      strengths.push({
        destaque: t("identity.signals.engagement_above.title"),
        detalhe: t("identity.signals.engagement_above.detail", { delta: Math.round(delta) }),
      });
    } else if (delta <= -30) {
      limits.push({
        destaque: t("identity.signals.engagement_below.title"),
        detalhe: t("identity.signals.engagement_below.detail", { delta: Math.round(delta) }),
      });
    }
  }

  // Interaction sub-score removido — sem benchmark fiável de comentários
  // por escalão, qualquer bullet de "interação" aqui seria especulativo.

  if (typeof dominantFormatShare === "number" && dominantFormatShare > 0) {
    if (dominantFormatShare < 55) {
      strengths.push({
        destaque: t("identity.signals.format_mixed.title"),
        detalhe: t("identity.signals.format_mixed.detail"),
      });
    } else if (dominantFormatShare >= 70) {
      limits.push({
        destaque: t("identity.signals.format_repetitive.title"),
        detalhe: t("identity.signals.format_repetitive.detail", {
          pct: Math.round(dominantFormatShare),
          format: formatNameSingular(dominantFormat, t),
        }),
      });
    }
  }

  while (strengths.length < 2) {
    strengths.push(
      strengths.length === 0
        ? {
            destaque: t("identity.signals.fallback_active.title"),
            detalhe: t("identity.signals.fallback_active.detail"),
          }
        : {
            destaque: t("identity.signals.fallback_history.title"),
            detalhe: t("identity.signals.fallback_history.detail"),
          },
    );
  }
  while (limits.length < 2) {
    limits.push(
      limits.length === 0
        ? {
            destaque: t("identity.signals.fallback_diversify.title"),
            detalhe: t("identity.signals.fallback_diversify.detail"),
          }
        : {
            destaque: t("identity.signals.fallback_conversation.title"),
            detalhe: t("identity.signals.fallback_conversation.detail"),
          },
    );
  }

  return { strengths: strengths.slice(0, 2), limits: limits.slice(0, 2) };
}

/* ── Main Component ────────────────────────────────────────────────── */

export function EditorialIdentityCard({
  scores,
  aiVerdict,
  keyMetrics,
  dominantFormat,
  dominantFormatShare,
  postingFrequencyWeekly,
  followers,
  postsAnalyzed,
  averageLikes,
  averageComments,
  cadenceSufficient,
  cadenceReliability,
  competitorsCount,
  cadenceMethod,
  cadenceWindowDays,
  hasRecurringHashtags,
  cadenceLabelPt,
  hashtagsState,
  topHashtags,
}: EditorialIdentityCardProps) {
  const { t, i18n } = useTranslation("report");

  // ── Resolução do veredicto: corre o guard determinístico ──────────
  // Constrói as métricas mínimas. Quando a IA não devolveu veredicto, o
  // guard cai automaticamente no fallback determinístico (também usado
  // como base de comparação para downgrades parciais).
  const verdictMetrics: EditorialVerdictMetrics = {
    postsPerWeek30d:
      typeof postingFrequencyWeekly === "number" ? postingFrequencyWeekly : null,
    cadenceSufficient: cadenceSufficient ?? true,
    cadenceReliability: cadenceReliability ?? "high",
    engagementPct: keyMetrics?.engagementRate ?? 0,
    benchmarkEngagementPct:
      keyMetrics && keyMetrics.engagementBenchmark > 0
        ? keyMetrics.engagementBenchmark
        : null,
    avgComments: typeof averageComments === "number" ? averageComments : 0,
    avgLikes: typeof averageLikes === "number" ? averageLikes : 0,
    competitorsCount: competitorsCount ?? 0,
    postsAnalyzed: typeof postsAnalyzed === "number" ? postsAnalyzed : 0,
  };
  const fallbackVerdict = buildFallbackVerdict(verdictMetrics, t, {
    cadenceMethod: cadenceMethod ?? null,
    cadenceWindowDays: cadenceWindowDays ?? null,
    hasRecurringHashtags: hasRecurringHashtags ?? null,
    cadenceLabelPt: cadenceLabelPt ?? null,
    hashtagsState: hashtagsState ?? null,
    topHashtags: topHashtags ?? null,
  });
  const resolution = deriveEditorialVerdict(
    aiVerdict ?? null,
    verdictMetrics,
    fallbackVerdict,
  );
  const resolved = resolution.verdict;

  // Nunca renderizamos `ai_insights_v2.sections.hero.text`. Quando a IA
  // não tem `editorial_verdict` válido, `resolved` é o fallback
  // determinístico (diagnóstico, sem verbos prescritivos).
  const copy: EditorialCopy = {
    title: resolved.title,
    paragraph: resolved.paragraph,
  };

  const overall = computeOverall(scores);
  const band: Band = verdictLabelToBand(resolved.verdict_label);
  const lowConfidence =
    typeof postsAnalyzed === "number" && postsAnalyzed > 0 && postsAnalyzed < 5;

  const derived = deriveSignals(
    scores,
    keyMetrics,
    dominantFormat,
    dominantFormatShare,
    postingFrequencyWeekly,
    followers,
    t,
    i18n.language,
  );
  const strengths: Bullet[] =
    resolution.source !== "fallback"
      ? resolved.strengths.map((s) => ({ destaque: s, detalhe: "" }))
      : derived.strengths;
  const limits: Bullet[] =
    resolution.source !== "fallback"
      ? resolved.limitations.map((s) => ({ destaque: s, detalhe: "" }))
      : derived.limits;

  const hasAnyMetric =
    typeof averageLikes === "number" ||
    typeof averageComments === "number" ||
    typeof postingFrequencyWeekly === "number";

  return (
    <article
      aria-label={t("identity.aria_label")}
      className="rounded-2xl border border-border-default bg-white shadow-card overflow-hidden"
    >
      {/* Zona macro — herói + régua compactos, veredicto logo a seguir */}
      <div className="px-6 py-6 sm:px-7 sm:py-7 flex flex-col gap-5">
        <IndexBlock
          value={overall}
          engagementRatePct={keyMetrics?.engagementRate ?? null}
          engagementBenchmarkPct={
            keyMetrics && keyMetrics.engagementBenchmark > 0
              ? keyMetrics.engagementBenchmark
              : null
          }
          followers={followers}
          postsAnalyzed={postsAnalyzed}
          cadenceWindowDays={cadenceWindowDays ?? null}
          band={band}
          t={t}
          locale={i18n.language}
        />

        <div className="min-w-0 space-y-3 border-t border-border-default/70 pt-5">
          <p className="text-eyebrow-sm text-content-tertiary">
            {t("identity.verdict_eyebrow", { defaultValue: "Veredicto" })}
          </p>
          <h2 className="font-display text-[1.375rem] md:text-[1.625rem] font-semibold leading-snug tracking-tight text-content-primary text-pretty">
            {copy.title}
          </h2>

          <p className="max-w-[62ch] text-[16px] leading-[1.6] text-content-primary whitespace-pre-line text-pretty">
            {copy.paragraph}
          </p>


          {resolution.source !== "fallback" && resolved.evidence_used.length >= 2 ? (
            <div className="pt-1">
              <p className="text-eyebrow-sm text-content-tertiary mb-1.5">
                {t("identity.evidence_title", {
                  defaultValue: "Sinais usados nesta leitura",
                })}
              </p>
              <ul className="space-y-1">
                {resolved.evidence_used.slice(0, 3).map((ev) => (
                  <li
                    key={ev}
                    className="text-[15px] leading-[1.6] text-content-secondary flex gap-2 items-start"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-[9px] inline-block w-1 h-1 rounded-full bg-content-tertiary/70 shrink-0"
                    />

                    <span>
                      {t(`identity.evidence.${ev}`, { defaultValue: ev })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {resolved.warnings && resolved.warnings.length > 0 ? (
            <p className="text-[15px] leading-[1.55] text-content-tertiary pt-1 text-pretty">
              {resolved.warnings
                .map((w) =>
                  t(`identity.warnings.${w}`, {
                    defaultValue:
                      w === "low_sample"
                        ? "Amostra pequena — leitura indicativa."
                        : w === "stale_data"
                          ? "Dados desactualizados."
                          : w === "cadence_uncertain"
                            ? "Cadência ainda inconclusiva."
                            : w === "no_market_signals"
                              ? "Sem sinais de pesquisa de mercado."
                              : "Sem benchmark comparável.",
                  }),
                )
                .join(" · ")}
            </p>
          ) : lowConfidence ? (
            <p className="text-[15px] leading-[1.55] text-content-tertiary pt-1">
              {t("identity.low_confidence", { count: postsAnalyzed })}
            </p>
          ) : null}
        </div>
      </div>

      {/* Zona evidência — gostos / comentários / ritmo (suporte, não dashboard) */}
      {hasAnyMetric && (
        <div className="px-6 pb-6 sm:px-7 sm:pb-7">
          <p className="text-eyebrow-sm text-content-tertiary mb-2.5">
            {t("identity.evidence_strip_title", { defaultValue: "Evidência" })}
          </p>
          <MetricsStrip
            averageLikes={averageLikes}
            averageComments={averageComments}
            postingFrequencyWeekly={postingFrequencyWeekly}
            followers={followers}
            t={t}
            locale={i18n.language}
          />
        </div>
      )}


      {/* Zona accionável */}
      <div className="border-t border-border-default grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border-default/60">
        <BulletColumn
          tone="success"
          title={t("identity.columns.strengths")}
          items={strengths}
        />
        <BulletColumn
          tone="warning"
          title={t("identity.columns.limits")}
          items={limits}
        />
      </div>
    </article>
  );
}

/* ── Index Block (linha herói full-width) ──────────────────────────── */

/**
 * Traduz a distância em pontos percentuais de envolvimento (vs benchmark
 * do escalão) para a escala 0–100 do índice agregado. Usa o peso do
 * envolvimento (45%) e uma aproximação linear de 10 pontos de índice por
 * 1 pp — suficiente para situar visualmente a mediana enquanto não
 * temos mediana real do escalão. Helper isolada para troca futura.
 */
function medianIndexFromBenchmark(
  overall: number,
  deltaPp: number | null,
): number | null {
  if (deltaPp === null) return null;
  const deltaIndex = deltaPp * 4.5; // 45% peso × ~10 pts por pp
  return Math.max(0, Math.min(100, overall - deltaIndex));
}

function IndexBlock({
  value,
  engagementRatePct,
  engagementBenchmarkPct,
  followers,
  postsAnalyzed,
  cadenceWindowDays,
  band,
  t,
  locale,
}: {
  value: number;
  engagementRatePct: number | null;
  engagementBenchmarkPct: number | null;
  followers?: number;
  postsAnalyzed?: number;
  cadenceWindowDays: number | null;
  band: Band;
  t: TFunction;
  locale: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const hasValue = value > 0;
  const tier =
    typeof followers === "number" && followers > 0
      ? tierLabelFromFollowers(followers)
      : null;
  const tierRange =
    typeof followers === "number" && followers > 0
      ? tierRangeFromFollowers(followers)
      : null;
  const tierWithRange =
    tier && tierRange ? `${tier} (${tierRange})` : tier;

  const hasBenchmark =
    engagementBenchmarkPct !== null &&
    engagementBenchmarkPct > 0 &&
    engagementRatePct !== null;
  const deltaPp = hasBenchmark
    ? (engagementRatePct as number) - (engagementBenchmarkPct as number)
    : null;

  // Leitura qualitativa do índice (sem números, sem percentagens) face ao
  // escalão. Substitui o antigo bloco de delta numérico para manter um só
  // número visível na caixa: o 31/100.
  const qualitativeLine = (() => {
    if (!hasValue || !tier) return null;
    const tierShort = tier;
    if (clamped < 25)
      return t("identity.index.qual_very_low", {
        tier: tierShort,
        defaultValue: `Espaço claro para crescer face ao escalão ${tierShort}.`,
      });
    if (clamped < 45)
      return t("identity.index.qual_below", {
        tier: tierShort,
        defaultValue: `Abaixo da mediana do escalão ${tierShort}.`,
      });
    if (clamped < 65)
      return t("identity.index.qual_aligned", {
        tier: tierShort,
        defaultValue: `Em linha com a mediana do escalão ${tierShort}.`,
      });
    if (clamped < 85)
      return t("identity.index.qual_above", {
        tier: tierShort,
        defaultValue: `Acima da mediana do escalão ${tierShort}.`,
      });
    return t("identity.index.qual_top", {
      tier: tierShort,
      defaultValue: `Destaque claro dentro do escalão ${tierShort}.`,
    });
  })();

  const medianIndex = medianIndexFromBenchmark(clamped, deltaPp);

  const sampleParts = [
    tier
      ? t("identity.method.sample.tier", {
          tier,
          defaultValue: `Escalão: ${tier}`,
        })
      : null,
    typeof postsAnalyzed === "number" && postsAnalyzed > 0
      ? t("identity.method.sample.posts", {
          count: postsAnalyzed,
          defaultValue: `Posts analisados: ${postsAnalyzed}`,
        })
      : null,
    typeof cadenceWindowDays === "number" && cadenceWindowDays > 0
      ? t("identity.method.sample.window", {
          days: cadenceWindowDays,
          defaultValue: `Janela: ${cadenceWindowDays} dias`,
        })
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-4">
      {/* a) Eyebrow + ⓘ */}
      <div className="flex items-center gap-1.5">
          <span className="text-eyebrow-sm text-content-tertiary">
            {tierWithRange
              ? t("identity.index.eyebrow_with_tier", {
                  tier: tierWithRange,
                  defaultValue: `Índice do perfil · ${tierWithRange}`,
                })
              : t("identity.index.eyebrow", {
                  defaultValue: "Índice do perfil",
                })}
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={t("identity.method.toggle", {
                  defaultValue: "Como foi calculado",
                })}
                className="inline-flex items-center justify-center rounded-full text-content-tertiary hover:text-content-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
              >
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="start"
              className="max-w-sm text-[13px] leading-snug space-y-2 text-content-secondary"
            >
              <p className="text-eyebrow-sm text-content-tertiary">
                {t("identity.method.toggle", {
                  defaultValue: "Como foi calculado",
                })}
              </p>
              <p>
                {t("identity.method.engagement_line", {
                  defaultValue:
                    "Envolvimento é a taxa de interação média por publicação (likes + comentários ÷ alcance estimado). O valor absoluto aparece em \u201CIndicadores principais\u201D, logo abaixo.",
                })}
              </p>
              <p>
                {t("identity.method.index_line", {
                  defaultValue:
                    "Índice (0\u2013100) combina envolvimento (60%) e cadência de publicação (40%), comparados com refer\u00EAncias de perfis semelhantes (Nano · Micro · Mid · Macro · Mega).",
                })}
              </p>
              {sampleParts.length > 0 ? (
                <p className="text-content-tertiary">{sampleParts.join(" · ")}</p>
              ) : null}
              <p className="text-content-tertiary italic">
                {t("identity.method.disclaimer", {
                  defaultValue:
                    "Leitura comparativa — não é uma métrica oficial do Instagram.",
                })}
              </p>
            </PopoverContent>
          </Popover>
      </div>

      {/* b + c) Número herói e régua lado a lado em desktop */}
      <div
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-7"
        data-band={band}
      >
        <div className="flex items-baseline gap-1.5 shrink-0">
          <span className="font-display text-[3.75rem] sm:text-[4.5rem] leading-none font-bold tabular-nums text-content-primary tracking-[-0.03em]">
            {hasValue ? clamped : "—"}
          </span>
          <span className="text-[1rem] font-medium text-content-secondary tabular-nums">
            / 100
          </span>
        </div>

        {hasValue ? (
          <div className="flex-1 min-w-0 sm:pb-1.5">
            <IndexRuler
              value={clamped}
              median={medianIndex}
              t={t}
              locale={locale}
            />
          </div>
        ) : (
          <p className="text-[14px] leading-snug text-content-secondary">
            {t("identity.index.no_value", {
              defaultValue: "Sem dados suficientes para calcular o índice.",
            })}
          </p>
        )}
      </div>


      {/* d) Leitura qualitativa do índice (sem números) */}
      {qualitativeLine ? (
        <p className="text-[14px] leading-snug text-content-secondary">
          {qualitativeLine}
        </p>
      ) : null}
    </div>
  );
}

/* ── Régua 0–100 com dois marcadores ───────────────────────────────── */

function IndexRuler({
  value,
  median,
  t,
  locale,
}: {
  value: number;
  median: number | null;
  t: TFunction;
  locale: string;
}) {
  const valuePct = Math.max(0, Math.min(100, value));
  const medianPct = median !== null ? Math.max(0, Math.min(100, median)) : null;
  const medianFormatted =
    median !== null ? formatDecimal(median, locale, median < 10 ? 1 : 0) : null;

  const ariaParts = [
    t("identity.index.rail_aria_value", {
      value: valuePct,
      defaultValue: `esta marca ${valuePct} de 100`,
    }),
    medianPct !== null
      ? t("identity.index.rail_aria_median", {
          value: medianFormatted,
          defaultValue: `mediana ${medianFormatted}`,
        })
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="flex-1 min-w-0 w-full">
      <div
        className="relative h-1.5 rounded-full bg-surface-muted"
        role="img"
        aria-label={ariaParts.join(" · ")}
      >
        {/* Barra preenchida até ao pin */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-accent-primary/25 to-accent-primary/55"
          style={{ width: `${valuePct}%` }}
        />

        {/* Marcador mediana */}
        {medianPct !== null ? (
          <span
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-px bg-content-tertiary"
            style={{ left: `${medianPct}%` }}
            aria-hidden="true"
            title={t("identity.index.median_tooltip", {
              value: medianFormatted,
              defaultValue: `mediana · ${medianFormatted}`,
            })}
          />
        ) : null}

        {/* Marcador esta marca (pin sólido) */}
        <span
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-accent-primary ring-2 ring-white shadow-[0_1px_3px_rgba(15,23,42,0.18)]"
          style={{ left: `${valuePct}%` }}
          aria-hidden="true"
        />

        {/* Label flutuante "esta marca" — desktop only */}
        <span
          className="hidden sm:inline-flex absolute -top-7 -translate-x-1/2 items-center rounded-md bg-accent-primary/10 px-2 py-0.5 text-[11px] font-medium text-accent-primary whitespace-nowrap"
          style={{ left: `${valuePct}%` }}
          aria-hidden="true"
        >
          {t("identity.index.this_brand_label", {
            defaultValue: "esta marca",
          })}
        </span>
      </div>

      {/* Endpoints 0 / 100 */}
      <div className="flex justify-between mt-2 text-[11px] text-content-tertiary tabular-nums">
        <span>0</span>
        <span>100</span>
      </div>

      {/* Legenda do pin vs mediana */}
      {medianPct !== null ? (
        <div className="flex items-center gap-3 mt-2 text-[12px] text-content-tertiary">
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full bg-accent-primary"
              aria-hidden="true"
            />
            {t("identity.index.legend_this", {
              defaultValue: "este perfil",
            })}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-3 w-px bg-content-tertiary"
              aria-hidden="true"
            />
            {t("identity.index.legend_median", {
              defaultValue: "mediana do escalão",
            })}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/* ── Bullet Column ─────────────────────────────────────────────────── */

function BulletColumn({
  tone,
  title,
  items,
  className,
}: {
  tone: Tone;
  title: string;
  items: Bullet[];
  className?: string;
}) {
  const accent = tone === "success" ? "text-signal-success" : "text-signal-warning";
  const dot = tone === "success" ? "bg-signal-success" : "bg-signal-warning";
  const surface =
    tone === "success"
      ? "bg-signal-success/[0.06] border-l-2 border-signal-success"
      : "bg-signal-warning/[0.07] border-l-2 border-signal-warning";
  const Icon = tone === "success" ? ArrowUpRight : ArrowDownRight;

  return (
    <div className={cn("px-6 py-5 sm:px-7 sm:py-6", surface, className)}>
      <div className="flex items-start gap-2 mb-3">
        <Icon className={cn("h-3.5 w-3.5 mt-0.5", accent)} aria-hidden="true" />
        <span className={cn("text-eyebrow-sm", accent)}>{title}</span>
      </div>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2.5 text-[17px] leading-[1.65]">
            <span
              className={cn("mt-[7px] h-1.5 w-1.5 rounded-full shrink-0", dot)}
              aria-hidden="true"
            />
            <span className="text-content-primary">
              <span className="font-medium text-content-primary">{it.destaque}</span>
              {" · "}
              {it.detalhe}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Metrics Strip ─────────────────────────────────────────────────── */

function commentsBand(avg: number): "low" | "medium" | "active" {
  if (avg >= 5) return "active";
  if (avg >= 1) return "medium";
  return "low";
}

function rhythmBand(ppw: number): "excess" | "good" | "low" {
  if (ppw > 7) return "excess";
  if (ppw >= 1) return "good";
  return "low";
}

function MetricsStrip({
  averageLikes,
  averageComments,
  postingFrequencyWeekly,
  followers,
  t,
  locale,
}: {
  averageLikes?: number;
  averageComments?: number;
  postingFrequencyWeekly?: number;
  followers?: number;
  t: TFunction;
  locale: string;
}) {
  const lang: "en" | "pt" = locale.startsWith("pt") ? "pt" : "en";
  type MetricTone = "neutral" | "info" | "success" | "warning";
  const items: Array<{
    key: string;
    icon: typeof Heart;
    label: string;
    value: string;
    unit: string;
    subtitle: string;
    tone: MetricTone;
  }> = [];

  if (typeof averageLikes === "number" && averageLikes >= 0) {
    const subtitle =
      typeof followers === "number" && followers > 0
        ? t("identity.metrics.likes_subtitle", {
            pct: formatDecimal((averageLikes / followers) * 100, locale, 2),
          })
        : t("identity.metrics.likes_subtitle_na");
    items.push({
      key: "likes",
      icon: Heart,
      label: t("identity.metrics.likes_label"),
      value: formatAvgMetric(averageLikes, lang),
      unit: t("identity.metrics.per_post"),
      subtitle,
      tone: "neutral",
    });
  }

  if (typeof averageComments === "number" && averageComments >= 0) {
    const band = commentsBand(averageComments);
    items.push({
      key: "comments",
      icon: MessageCircle,
      label: t("identity.metrics.comments_label"),
      value: formatAvgMetric(averageComments, lang),
      unit: t("identity.metrics.per_post"),
      subtitle: t(`identity.metrics.comments_${band}`),
      tone: band === "active" ? "success" : band === "medium" ? "info" : "neutral",
    });
  }

  if (typeof postingFrequencyWeekly === "number" && postingFrequencyWeekly >= 0) {
    const band = rhythmBand(postingFrequencyWeekly);
    items.push({
      key: "rhythm",
      icon: CalendarDays,
      label: t("identity.metrics.rhythm_label"),
      value: formatDecimal(postingFrequencyWeekly, locale, 1),
      unit: t("identity.metrics.per_week"),
      subtitle: t(`identity.metrics.rhythm_${band}`),
      tone: band === "excess" ? "warning" : band === "good" ? "info" : "neutral",
    });
  }

  if (items.length === 0) return null;

  const toneClass: Record<MetricTone, string> = {
    neutral: "bg-surface-muted text-content-secondary",
    info: "bg-accent-primary/10 text-accent-primary",
    success: "bg-signal-success/10 text-signal-success",
    warning: "bg-signal-warning/15 text-signal-warning",
  };

  return (
    <div className="rounded-xl border border-border-default bg-white grid grid-cols-1 sm:grid-cols-3 overflow-hidden divide-y divide-border-default/60 sm:divide-y-0">
      {items.map((it, idx) => {
        const Icon = it.icon;
        const isFirst = idx === 0;
        return (
          <div
            key={it.key}
            className={cn(
              "px-5 py-5 sm:px-6 sm:py-6",
              !isFirst && "sm:border-l sm:border-border-default/60",
            )}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-accent-primary/10 shrink-0">
                <Icon className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
              </span>
              <span className="text-eyebrow-sm text-content-secondary">{it.label}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-sans text-[2rem] sm:text-[2.25rem] font-semibold tabular-nums text-content-primary leading-none">
                {it.value}
              </span>
              <span className="text-[15px] font-medium text-content-tertiary">{it.unit}</span>
            </div>
            {it.key === "likes" ? (
              <p className="mt-3 text-[15px] leading-[1.5] text-content-secondary">{it.subtitle}</p>
            ) : (
              <span
                className={cn(
                  "mt-3 inline-flex items-center rounded-full px-2.5 py-1 text-[13px] font-medium",
                  toneClass[it.tone],
                )}
              >
                {it.subtitle}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
