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
  ChevronDown,
  Heart,
  MessageCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import type { TFunction } from "i18next";
import { formatCompactNumber } from "@/lib/i18n/format";
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

/** Stage rail (4 níveis discretos, apenas leitura visual). */
type Stage = "leader" | "competitive" | "progress" | "emerging";

function stageFromScore(value: number): Stage {
  if (value >= 80) return "leader";
  if (value >= 60) return "competitive";
  if (value >= 40) return "progress";
  return "emerging";
}

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
 * (pesos: envolvimento 45%, ritmo 25%, conversa 30%).
 */
function computeOverall(
  scores: Record<ScoreKey, { value: number; subtitle: string }>,
): number {
  const raw = computeGlobalScore(
    scores.envolvimento.value,
    scores.frequencia.value,
    scores.interaccao.value,
  );
  return Math.max(0, Math.min(100, raw));
}

function verdictLabelToBand(label: EditorialVerdict["verdict_label"]): Band {
  if (label === "strong") return "solid";
  if (label === "promising") return "developing";
  return "warning"; // needs_work | limited_data
}

function bandLabel(band: Band, t: TFunction): string {
  return t(`identity.bands.${band}`);
}

function bandTextClass(band: Band): string {
  if (band === "solid") return "text-signal-success";
  if (band === "developing") return "text-accent-primary";
  return "text-signal-warning";
}

function bandFillClass(band: Band): string {
  if (band === "solid") return "bg-signal-success";
  if (band === "developing") return "bg-accent-primary";
  return "bg-signal-warning";
}

function bandBadgeClass(band: Band): string {
  if (band === "solid") return "bg-signal-success/10 text-signal-success";
  if (band === "developing") return "bg-accent-primary/10 text-accent-primary";
  return "bg-signal-warning/15 text-signal-warning";
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

  const inter = scores.interaccao.value;
  if (inter >= 60) {
    strengths.push({
      destaque: t("identity.signals.interaction_active.title"),
      detalhe: t("identity.signals.interaction_active.detail"),
    });
  } else if (inter < 30) {
    limits.push({
      destaque: t("identity.signals.interaction_low.title"),
      detalhe: t("identity.signals.interaction_low.detail"),
    });
  }

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
  const hasProvisionalWarning =
    Array.isArray(resolved.warnings) &&
    resolved.warnings.some((w) =>
      [
        "low_sample",
        "stale_data",
        "cadence_uncertain",
        "benchmark_missing",
        "no_market_signals",
      ].includes(w),
    );
  const isProvisional = resolution.source !== "ai" || hasProvisionalWarning;

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
      {/* Zona macro */}
      <div className="px-6 py-7 sm:px-7 sm:py-8 flex flex-col sm:flex-row sm:items-stretch gap-6 sm:gap-10">
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
          t={t}
          locale={i18n.language}
        />

        <div className="flex-1 min-w-0 space-y-3.5 sm:pl-8 sm:border-l sm:border-border-default">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-eyebrow-sm text-content-tertiary">
              {t("identity.eyebrow_verdict")}
            </span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5",
                "text-xs font-semibold tracking-wide uppercase leading-none",
                bandBadgeClass(band),
              )}
            >
              {bandLabel(band, t)}
            </span>
            {isProvisional ? (
              <span
                className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium tracking-wide uppercase leading-none text-content-tertiary"
                title={t("identity.verdict.provisional_hint", {
                  defaultValue:
                    "Leitura ajustada por divergência entre a interpretação editorial e os números observados.",
                })}
              >
                {t("identity.verdict.provisional", {
                  defaultValue: "Leitura provisória",
                })}
              </span>
            ) : null}
          </div>

          <h2 className="font-display text-[1.25rem] md:text-[1.5rem] font-semibold leading-snug tracking-tight text-content-primary max-w-2xl">
            {copy.title}
          </h2>

          <p className="text-[17px] leading-[1.65] text-content-primary max-w-2xl whitespace-pre-line">
            {copy.paragraph}
          </p>

          {resolution.source !== "fallback" && resolved.evidence_used.length >= 2 ? (
            <div className="pt-1 max-w-2xl">
              <p className="text-eyebrow-sm text-content-tertiary mb-1.5">
                {t("identity.evidence_title", {
                  defaultValue: "Sinais usados nesta leitura",
                })}
              </p>
              <ul className="space-y-1">
                {resolved.evidence_used.slice(0, 3).map((ev) => (
                  <li
                    key={ev}
                    className="text-sm text-content-secondary flex gap-2 items-start"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 inline-block w-1 h-1 rounded-full bg-content-tertiary/70 shrink-0"
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
            <p className="text-xs text-content-tertiary pt-1">
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
            <p className="text-xs text-content-tertiary pt-1">
              {t("identity.low_confidence", { count: postsAnalyzed })}
            </p>
          ) : null}
        </div>
      </div>

      {/* Zona métrica — gostos / comentários / ritmo */}
      {hasAnyMetric && (
        <div className="px-6 pb-7 sm:px-7">
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

/* ── Index Block (header esquerdo) ─────────────────────────────────── */

/**
 * Bloco do índice do perfil. Mostra apenas dados reais:
 *   • número agregado (0–100) calculado a partir de 3 sinais do perfil
 *   • subtítulo dinâmico — só compara quando existe benchmark real
 *   • régua vertical com 4 estágios discretos (sem mediana inventada)
 *   • "Como foi calculado" colapsável com a fórmula real e a amostra
 *
 * Não inventa "mediana · 60" nem "4 sinais". Quando um dado falta,
 * a linha correspondente simplesmente não é renderizada.
 */
function IndexBlock({
  value,
  engagementRatePct,
  engagementBenchmarkPct,
  followers,
  postsAnalyzed,
  cadenceWindowDays,
  t,
  locale,
}: {
  value: number;
  engagementRatePct: number | null;
  engagementBenchmarkPct: number | null;
  followers?: number;
  postsAnalyzed?: number;
  cadenceWindowDays: number | null;
  t: TFunction;
  locale: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const hasValue = value > 0;
  const stage = stageFromScore(clamped);
  const tier =
    typeof followers === "number" && followers > 0
      ? tierLabelFromFollowers(followers)
      : null;

  // Subtítulo: só compara quando há benchmark real.
  const hasBenchmark =
    engagementBenchmarkPct !== null &&
    engagementBenchmarkPct > 0 &&
    engagementRatePct !== null;
  const deltaPp = hasBenchmark
    ? (engagementRatePct as number) - (engagementBenchmarkPct as number)
    : null;
  const subtitle = (() => {
    if (deltaPp === null) {
      return t("identity.index.subtitle_no_benchmark", {
        defaultValue: "Índice de atividade do perfil",
      });
    }
    const abs = Math.abs(deltaPp);
    const ppFormatted = formatDecimal(abs, locale, abs < 1 ? 2 : 1);
    const dirKey = deltaPp >= 0 ? "above" : "below";
    return t(`identity.index.subtitle_${dirKey}`, {
      pp: ppFormatted,
      defaultValue:
        deltaPp >= 0
          ? `${ppFormatted} pp acima da referência de envolvimento do escalão`
          : `${ppFormatted} pp abaixo da referência de envolvimento do escalão`,
    });
  })();

  const stages: Array<{ key: Stage; label: string }> = [
    { key: "leader", label: t("identity.index.stage.leader", { defaultValue: "Líder" }) },
    { key: "competitive", label: t("identity.index.stage.competitive", { defaultValue: "Competitivo" }) },
    { key: "progress", label: t("identity.index.stage.progress", { defaultValue: "Em progresso" }) },
    { key: "emerging", label: t("identity.index.stage.emerging", { defaultValue: "Emergente" }) },
  ];
  const currentStageLabel =
    stages.find((s) => s.key === stage)?.label ?? stage;

  const [methodOpen, setMethodOpen] = useState(false);

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
    <div className="shrink-0 sm:w-[300px] flex flex-col gap-5 h-full pb-6 mb-2 border-b border-border-default sm:pb-0 sm:mb-0 sm:border-b-0">
      {/* Eyebrow + número + subtítulo + micro-linha */}
      <div className="space-y-2">
        <span className="text-eyebrow-sm text-content-tertiary">
          {t("identity.index.eyebrow", { defaultValue: "Índice do perfil" })}
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-[3rem] leading-none font-semibold tabular-nums text-content-primary">
            {hasValue ? clamped : "—"}
          </span>
          <span className="text-[15px] text-content-secondary tabular-nums">
            / 100
          </span>
        </div>
        <p className="text-[14px] leading-snug text-content-primary max-w-[260px]">
          {hasValue
            ? subtitle
            : t("identity.index.no_value", {
                defaultValue: "Sem dados suficientes para calcular o índice.",
              })}
        </p>
        <p className="text-xs leading-snug text-content-tertiary max-w-[260px]">
          {t("identity.index.microline", {
            defaultValue:
              "Índice comparativo, calculado a partir de 3 sinais observados no perfil.",
          })}
        </p>
      </div>

      {/* Régua vertical de estágios */}
      {hasValue ? (
        <div
          className="flex gap-3 min-h-[148px]"
          role="img"
          aria-label={t("identity.index.rail_aria_full", {
            value: clamped,
            stage: currentStageLabel,
            defaultValue: `Índice ${clamped} de 100, estágio ${currentStageLabel}`,
          })}
        >
          <div className="flex flex-col w-2 gap-1 bg-surface-muted rounded-full p-0.5">
            {stages.map((s) => {
              const isCurrent = s.key === stage;
              return (
                <div
                  key={s.key}
                  className={cn(
                    "flex-1 rounded-full",
                    isCurrent ? "bg-accent-primary" : "bg-transparent",
                  )}
                />
              );
            })}
          </div>
          <ul className="flex flex-col justify-around text-[13px] leading-tight flex-1">
            {stages.map((s) => {
              const isCurrent = s.key === stage;
              return (
                <li
                  key={s.key}
                  className={cn(
                    "flex flex-col",
                    isCurrent ? "text-content-primary" : "text-content-tertiary",
                  )}
                >
                  <span className={cn(isCurrent && "text-[14px] font-medium")}>
                    {s.label}
                  </span>
                  {isCurrent ? (
                    <span className="text-accent-primary font-medium tabular-nums mt-1 inline-flex items-center gap-1 self-start bg-accent-primary/10 px-2 py-0.5 rounded-md text-[12px]">
                      <span aria-hidden="true">▸</span>
                      <span>
                        {t("identity.index.this_brand", {
                          value: clamped,
                          defaultValue: `esta marca · ${clamped}`,
                        })}
                      </span>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* "Como foi calculado" colapsável */}
      <details
        className={cn(
          "group rounded-lg border border-border-default transition-colors mt-auto",
          methodOpen ? "bg-surface-muted/50" : "bg-white",
        )}
        onToggle={(e) => setMethodOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary
          aria-expanded={methodOpen}
          className={cn(
            "flex items-center justify-between gap-2 cursor-pointer list-none",
            "px-3 py-2.5 text-[11px] font-medium uppercase tracking-wide text-content-tertiary",
            "hover:text-content-primary transition-colors",
          )}
        >
          <span>
            {t("identity.method.toggle", { defaultValue: "Como foi calculado" })}
          </span>
          <ChevronDown
            className="h-3 w-3 text-content-tertiary transition-transform duration-200 group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="px-3.5 pb-3.5 pt-1 space-y-2.5 text-xs leading-snug text-content-secondary">
          <p>
            {t("identity.method.signals_line", {
              defaultValue:
                "Construído a partir de 3 indicadores do perfil: envolvimento, ritmo de publicação e conversa nas legendas.",
            })}
          </p>
          <p>
            {t("identity.method.benchmark_line", {
              defaultValue:
                "Comparado com o benchmark de envolvimento do escalão de referência (Nano · Micro · Mid · Macro · Mega), com base na atividade recente observada.",
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
        </div>
      </details>
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
  const borderLeft =
    tone === "success" ? "border-l-2 border-signal-success" : "border-l-2 border-signal-warning";
  const Icon = tone === "success" ? ArrowUpRight : ArrowDownRight;

  return (
    <div className={cn("bg-white px-5 py-4 sm:px-6 sm:py-5", borderLeft, className)}>
      <div className="flex items-start gap-2 mb-3">
        <Icon className={cn("h-3.5 w-3.5 mt-0.5", accent)} aria-hidden="true" />
        <span className={cn("text-eyebrow-sm", accent)}>{title}</span>
      </div>
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2.5 text-[15px] leading-[1.55]">
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
  const items: Array<{
    key: string;
    icon: typeof Heart;
    label: string;
    value: string;
    unit: string;
    subtitle: string;
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
    });
  }

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-border-default bg-white grid grid-cols-1 sm:grid-cols-3 overflow-hidden divide-y divide-border-default sm:divide-y-0">
      {items.map((it, idx) => {
        const Icon = it.icon;
        const isFirst = idx === 0;
        return (
          <div
            key={it.key}
            className={cn(
              "px-5 py-4 sm:px-6 sm:py-5",
              !isFirst && "sm:border-l sm:border-border-default/60",
            )}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
              <span className="text-eyebrow-sm text-content-secondary">{it.label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-sans text-[1.75rem] md:text-[1.625rem] font-semibold tabular-nums text-content-primary leading-none">
                {it.value}
              </span>
              <span className="text-[15px] text-content-secondary">{it.unit}</span>
            </div>
            <p className="mt-2 text-[13px] text-content-secondary leading-snug">{it.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}
