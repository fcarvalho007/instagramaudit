/**
 * Editorial Identity Card — Veredicto executivo (Block 1)
 *
 * Layout (mockup):
 *   Zona macro  | gauge circular + eyebrow VEREDICTO + badge de estado +
 *               | título editorial + síntese curta + barra de referência
 *   Zona accionável | duas colunas: "O QUE JÁ FUNCIONA" (success) /
 *                   | "O QUE LIMITA O CRESCIMENTO" (warning), 2 bullets cada.
 *
 * Sem nova chamada de IA. Título/síntese vêm de `aiInsightsV2.hero.text`
 * com fallback determinístico. Pontos fortes/limitações são derivados de
 * sinais já presentes no snapshot (scores + keyMetrics + formato dominante
 * + frequência semanal + tier de seguidores).
 */
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Heart, MessageCircle, CalendarDays } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { formatCompactNumber } from "@/lib/i18n/format";
import type { ScoreKey } from "./score-utils";

/* ── Types ─────────────────────────────────────────────────────────── */

type Band = "warning" | "developing" | "solid";

type Tone = "success" | "warning";

interface Bullet {
  destaque: string;
  detalhe: string;
}

interface EditorialIdentityCardProps {
  scores: Record<ScoreKey, { value: number; subtitle: string }>;
  /** AI hero insight text, if available */
  aiHeroText?: string | null;
  /** Extra key metrics for richer subtitles */
  keyMetrics?: {
    engagementRate: number;
    engagementBenchmark: number;
    engagementDeltaPct: number;
  };
  /** Optional signals usados para derivar bullets de fortes/limitações */
  dominantFormat?: "Reels" | "Carousels" | "Imagens" | string;
  dominantFormatShare?: number;
  postingFrequencyWeekly?: number;
  followers?: number;
  postsAnalyzed?: number;
  /** Avg likes per analyzed post. */
  averageLikes?: number;
  /** Avg comments per analyzed post. */
  averageComments?: number;
}

/* ── Fallback determinístico ───────────────────────────────────────── */

interface EditorialCopy {
  title: string;
  paragraph: string;
}

function buildFallbackCopy(
  scores: Record<ScoreKey, { value: number; subtitle: string }>,
  t: TFunction,
): EditorialCopy {
  const eng = scores.envolvimento.value;
  const freq = scores.frequencia.value;
  const inter = scores.interaccao.value;

  const pick = (key: string): EditorialCopy => ({
    title: t(`identity.fallback.${key}.title`),
    paragraph: t(`identity.fallback.${key}.paragraph`),
  });
  if (eng >= 60 && freq >= 60) return pick("solid_consistent");
  if (eng >= 60 && freq < 40) return pick("irregular_reach");
  if (freq >= 60 && eng < 40) return pick("cadence_no_signal");
  if (eng < 40 && inter < 40) return pick("no_direction");
  return pick("opportunity");
}

/* ── AI text sanitization ──────────────────────────────────────────── */

const FORBIDDEN_PREFIX = /^\s*(a\s+ia\s+(conclui|concluiu|observa|nota|identifica|deteta|detecta|analisa)|segundo\s+a\s+ia)[:,.\s-]*/i;

function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

function splitFirstSentence(text: string): { first: string; rest: string } {
  const m = text.match(/^(.+?[.!?])\s+(.+)$/s);
  if (m) return { first: m[1].trim(), rest: m[2].trim() };
  return { first: text.trim(), rest: "" };
}

function trimParagraphToSentence(text: string, maxChars = 320): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars);
  const lastStop = Math.max(slice.lastIndexOf("."), slice.lastIndexOf("!"), slice.lastIndexOf("?"));
  if (lastStop > 80) return slice.slice(0, lastStop + 1).trim();
  return slice.trim() + "…";
}

function deriveCopyFromAi(
  aiHeroText: string,
  fallback: EditorialCopy,
): EditorialCopy {
  const cleaned = aiHeroText.replace(FORBIDDEN_PREFIX, "").trim();
  if (!cleaned) return fallback;

  const { first, rest } = splitFirstSentence(cleaned);
  const firstClean = first.replace(/[.!?]+$/, "").trim();

  // Title rule: ≤ 5 words. If AI first sentence is short enough, use it as
  // title and let the remaining sentences be the paragraph. Otherwise fall
  // back to the deterministic title but keep the FULL AI text as paragraph
  // — discarding the first sentence drops the metric framing the IA wrote.
  const titleFromAi = countWords(firstClean) <= 5;
  const title = titleFromAi ? firstClean : fallback.title;
  const paragraphRaw = titleFromAi ? (rest || cleaned) : cleaned;
  const paragraph = trimParagraphToSentence(paragraphRaw);

  return { title, paragraph: paragraph || fallback.paragraph };
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

function bandFor(score: number): Band {
  if (score >= 70) return "solid";
  if (score >= 40) return "developing";
  return "warning";
}

function bandLabel(band: Band, t: TFunction): string {
  return t(`identity.bands.${band}`);
}

/** Mapeia a banda para a cor do arco/badge. Construtivo — nunca vermelho. */
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
  if (band === "solid")
    return "bg-signal-success/10 text-signal-success";
  if (band === "developing")
    return "bg-accent-primary/10 text-accent-primary";
  return "bg-signal-warning/15 text-signal-warning";
}

/* ── Derivação determinística de pontos fortes / limitações ──────── */

interface DerivedSignals {
  strengths: Bullet[];
  limits: Bullet[];
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

function deriveSignals(
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

  // Frequência
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

  // Base de seguidores
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

  // Engagement vs benchmark
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

  // Interação / comentários
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

  // Concentração de formato
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

  // Garantir 2+2 com fallbacks neutros (sem inflacionar)
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
  aiHeroText,
  keyMetrics,
  dominantFormat,
  dominantFormatShare,
  postingFrequencyWeekly,
  followers,
  postsAnalyzed,
  averageLikes,
  averageComments,
}: EditorialIdentityCardProps) {
  const { t, i18n } = useTranslation("report");
  const fallback = buildFallbackCopy(scores, t);
  const copy = aiHeroText ? deriveCopyFromAi(aiHeroText, fallback) : fallback;
  const overall = computeOverall(scores);
  const band = bandFor(overall);
  const lowConfidence =
    typeof postsAnalyzed === "number" && postsAnalyzed > 0 && postsAnalyzed < 5;

  const { strengths, limits } = deriveSignals(
    scores,
    keyMetrics,
    dominantFormat,
    dominantFormatShare,
    postingFrequencyWeekly,
    followers,
    t,
    i18n.language,
  );

  return (
    <article
      aria-label={t("identity.aria_label")}
      className="rounded-2xl border border-border-default bg-white shadow-card overflow-hidden"
    >
      {/* Zona macro */}
      <div className="px-6 py-7 flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-8">
        <div className="self-center sm:self-start shrink-0">
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
          </div>

          <h2 className="font-display text-xl sm:text-2xl font-semibold leading-[1.25] tracking-[-0.015em] text-content-primary max-w-2xl">
            {copy.title}
          </h2>

          <p className="text-[15px] leading-relaxed text-content-secondary max-w-2xl">
            {copy.paragraph}
          </p>

          {lowConfidence ? (
            <p className="text-xs text-content-tertiary pt-1">
              {t("identity.low_confidence", { count: postsAnalyzed })}
            </p>
          ) : (
            <ReferenceBar value={overall} reference={60} band={band} t={t} />
          )}
        </div>
      </div>

      {/* Zona métrica — gostos / comentários / ritmo */}
      {(typeof averageLikes === "number" ||
        typeof averageComments === "number" ||
        typeof postingFrequencyWeekly === "number") && (
        <div className="px-6 pb-6">
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
  const bg = tone === "success" ? "bg-tint-success" : "bg-tint-warning";
  const accent = tone === "success" ? "text-signal-success" : "text-signal-warning";
  const dot = tone === "success" ? "bg-signal-success" : "bg-signal-warning";
  const Icon = tone === "success" ? ArrowUpRight : ArrowDownRight;

  return (
    <div className={cn("px-5 py-5 sm:px-7 sm:py-6", bg, className)}>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("h-3.5 w-3.5", accent)} aria-hidden="true" />
        <span className={cn("text-eyebrow-sm", accent)}>{title}</span>
      </div>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-[15px] leading-relaxed">
            <span
              className={cn(
                "mt-1.5 h-1.5 w-1.5 rounded-full shrink-0",
                dot,
              )}
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

function formatDecimal(value: number, locale: string, digits = 1): string {
  const sep = locale.startsWith("pt") ? "," : ".";
  return value.toFixed(digits).replace(".", sep);
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
  const lang: "pt" | "en" = locale.startsWith("pt") ? "pt" : "en";
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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div
            key={it.key}
            className="rounded-xl border border-border-default bg-surface-muted px-4 py-3.5"
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Icon
                className="h-3.5 w-3.5 text-accent-primary"
                aria-hidden="true"
              />
              <span className="text-eyebrow-sm text-content-tertiary">
                {it.label}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-sans text-xl font-semibold tabular-nums text-content-primary leading-none">
                {it.value}
              </span>
              <span className="text-sm text-content-secondary">{it.unit}</span>
            </div>
            <p className="mt-1 text-xs text-content-tertiary">{it.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}
