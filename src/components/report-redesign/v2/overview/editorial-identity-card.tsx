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
  MessageCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { formatCompactNumber } from "@/lib/i18n/format";
import type { ScoreKey } from "./score-utils";
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
}

interface EditorialCopy {
  title: string;
  paragraph: string;
}

/* ── Pontuação + bandas ────────────────────────────────────────────── */

function computeOverall(
  scores: Record<ScoreKey, { value: number; subtitle: string }>,
): number {
  const e = scores.envolvimento.value;
  const f = scores.frequencia.value;
  const i = scores.interaccao.value;
  return Math.max(0, Math.min(100, Math.round(0.5 * e + 0.3 * f + 0.2 * i)));
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
  const fallbackVerdict = buildFallbackVerdict(verdictMetrics, t);
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
      <div className="px-6 py-7 sm:px-7 sm:py-8 flex flex-col sm:flex-row sm:items-stretch gap-6 sm:gap-8">
        <div className="self-center sm:self-stretch shrink-0 flex items-center justify-center rounded-2xl bg-surface-muted/60 px-6 py-5 sm:py-6">
          <ScoreGauge value={overall} band={band} t={t} />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
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
          ) : (
            <ReferenceBar value={overall} reference={60} band={band} t={t} />
          )}
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
      <div className="border-t border-border-default grid grid-cols-1 md:grid-cols-2">
        <BulletColumn
          tone="success"
          title={t("identity.columns.strengths")}
          items={strengths}
        />
        <BulletColumn
          tone="warning"
          title={t("identity.columns.limits")}
          items={limits}
          className="border-t md:border-t-0 md:border-l border-border-default"
        />
      </div>
    </article>
  );
}

/* ── Score Gauge ───────────────────────────────────────────────────── */

function ScoreGauge({ value, band, t }: { value: number; band: Band; t: TFunction }) {
  const clamped = Math.max(0, Math.min(100, value));
  const size = 124;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      role="img"
      aria-label={t("identity.gauge_aria", { value: clamped })}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="text-border-default/40"
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={cn(bandTextClass(band), "transition-[stroke-dashoffset] duration-700")}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[2.5rem] leading-none font-semibold tabular-nums text-content-primary">
          {clamped}
        </span>
        <span className="text-eyebrow-sm text-content-tertiary mt-1">
          {t("identity.gauge_caption")}
        </span>
      </div>
    </div>
  );
}

/* ── Reference Bar ─────────────────────────────────────────────────── */

function ReferenceBar({
  value,
  reference,
  band,
  t,
}: {
  value: number;
  reference: number;
  band: Band;
  t: TFunction;
}) {
  const v = Math.max(0, Math.min(100, value));
  const ref = Math.max(0, Math.min(100, reference));

  return (
    <div className="pt-2" aria-hidden="true">
      <div className="relative h-1.5 rounded-full bg-surface-muted overflow-visible">
        <div
          className={cn("h-full rounded-full transition-all duration-700", bandFillClass(band))}
          style={{ width: `${v}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-content-tertiary/70"
          style={{ left: `${ref}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs text-content-tertiary tabular-nums">
        <span>0</span>
        <span>{t("identity.reference_caption", { ref })}</span>
        <span>100</span>
      </div>
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
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-[15px] leading-relaxed">
            <span
              className={cn("mt-1.5 h-1.5 w-1.5 rounded-full shrink-0", dot)}
              aria-hidden="true"
            />
            <span className="text-content-secondary">
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
      value: formatCompactNumber(Math.round(averageLikes), lang),
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
      value: formatCompactNumber(Math.round(averageComments), lang),
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
    <div className="rounded-xl border border-border-default bg-white grid grid-cols-1 sm:grid-cols-3 overflow-hidden">
      {items.map((it, idx) => {
        const Icon = it.icon;
        const isFirst = idx === 0;
        return (
          <div
            key={it.key}
            className={cn(
              "px-5 py-4 sm:px-6 sm:py-5",
              !isFirst && "border-t border-border-default sm:border-t-0 sm:border-l sm:border-border-default/60",
            )}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className="h-3.5 w-3.5 text-accent-primary" aria-hidden="true" />
              <span className="text-eyebrow-sm text-content-tertiary">{it.label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-sans text-[1.625rem] font-semibold tabular-nums text-content-primary leading-none">
                {it.value}
              </span>
              <span className="text-sm text-content-secondary">{it.unit}</span>
            </div>
            <p className="mt-1.5 text-xs text-content-tertiary leading-snug">{it.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}
