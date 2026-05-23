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
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
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
}

/* ── Fallback determinístico ───────────────────────────────────────── */

interface EditorialCopy {
  title: string;
  paragraph: string;
}

function buildFallbackCopy(
  scores: Record<ScoreKey, { value: number; subtitle: string }>,
): EditorialCopy {
  const eng = scores.envolvimento.value;
  const freq = scores.frequencia.value;
  const inter = scores.interaccao.value;

  if (eng >= 60 && freq >= 60) {
    return {
      title: "Presença sólida e consistente",
      paragraph:
        "O conteúdo gera resposta de forma regular e a cadência é estável. A próxima alavanca está em diversificar formatos e abrir mais conversa nos comentários.",
    };
  }
  if (eng >= 60 && freq < 40) {
    return {
      title: "Bom alcance, ritmo irregular",
      paragraph:
        "O conteúdo funciona quando sai, mas o ritmo de publicação é descontínuo. Estabilizar a cadência semanal é o passo com maior retorno imediato.",
    };
  }
  if (freq >= 60 && eng < 40) {
    return {
      title: "Cadência forte, sinal fraco",
      paragraph:
        "Existe disciplina de publicação, mas o conteúdo não está a converter em interação. O foco deve ir para o conceito editorial e o gancho inicial de cada peça.",
    };
  }
  if (eng < 40 && inter < 40) {
    return {
      title: "Audiência existe, falta direção",
      paragraph:
        "A base de seguidores não está a reagir nem a comentar de forma significativa. A prioridade é redefinir ângulo editorial e formatos antes de aumentar volume.",
    };
  }
  return {
    title: "Perfil ativo, oportunidade clara",
    paragraph:
      "Os indicadores estão próximos da referência do escalão. Há espaço para subir engagement ajustando formatos dominantes e reforçando a conversa nos comentários.",
  };
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

function bandLabel(band: Band): string {
  if (band === "solid") return "Sólido";
  if (band === "developing") return "Em desenvolvimento";
  return "Precisa de trabalho";
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

function formatNameSingular(fmt: string | undefined): string {
  if (!fmt) return "formato dominante";
  if (fmt === "Reels") return "reels";
  if (fmt === "Carousels") return "carrosséis";
  if (fmt === "Imagens") return "imagens";
  return fmt.toLowerCase();
}

function deriveSignals(
  scores: Record<ScoreKey, { value: number; subtitle: string }>,
  keyMetrics: EditorialIdentityCardProps["keyMetrics"],
  dominantFormat: string | undefined,
  dominantFormatShare: number | undefined,
  postingFrequencyWeekly: number | undefined,
  followers: number | undefined,
): DerivedSignals {
  const strengths: Bullet[] = [];
  const limits: Bullet[] = [];

  // Frequência
  const ppw = typeof postingFrequencyWeekly === "number" ? postingFrequencyWeekly : null;
  if (ppw !== null) {
    if (ppw >= 3 && ppw <= 7) {
      const perDay = (ppw / 7).toFixed(1).replace(".", ",");
      strengths.push({
        destaque: "Publicação consistente",
        detalhe: `cerca de ${perDay} post/dia`,
      });
    } else if (ppw < 1) {
      limits.push({
        destaque: "Cadência fraca",
        detalhe: "menos de 1 post por semana",
      });
    } else if (ppw > 7) {
      limits.push({
        destaque: "Volume excessivo",
        detalhe: "acima de 1 post por dia",
      });
    }
  }

  // Base de seguidores
  if (typeof followers === "number" && followers > 0) {
    const tier = tierLabelFromFollowers(followers);
    if (tier !== "Nano") {
      strengths.push({
        destaque: "Base de seguidores",
        detalhe: "relevante para o nicho",
      });
    } else if (followers < 2_000) {
      limits.push({
        destaque: "Audiência ainda pequena",
        detalhe: "espaço claro para crescer",
      });
    }
  }

  // Engagement vs benchmark
  if (keyMetrics && keyMetrics.engagementBenchmark > 0) {
    const delta = keyMetrics.engagementDeltaPct;
    if (delta >= 10) {
      strengths.push({
        destaque: "Envolvimento acima do escalão",
        detalhe: `+${Math.round(delta)}% vs benchmark`,
      });
    } else if (delta <= -30) {
      limits.push({
        destaque: "Envolvimento abaixo do escalão",
        detalhe: `${Math.round(delta)}% vs benchmark`,
      });
    }
  }

  // Interação / comentários
  const inter = scores.interaccao.value;
  if (inter >= 60) {
    strengths.push({
      destaque: "Conversa ativa nos comentários",
      detalhe: "público responde com regularidade",
    });
  } else if (inter < 30) {
    limits.push({
      destaque: "Poucos comentários",
      detalhe: "falta CTA claro nas legendas",
    });
  }

  // Concentração de formato
  if (typeof dominantFormatShare === "number" && dominantFormatShare > 0) {
    if (dominantFormatShare < 55) {
      strengths.push({
        destaque: "Mix de formatos equilibrado",
        detalhe: "alternância entre tipos de conteúdo",
      });
    } else if (dominantFormatShare >= 70) {
      limits.push({
        destaque: "Formato repetitivo",
        detalhe: `${Math.round(dominantFormatShare)}% ${formatNameSingular(dominantFormat)}`,
      });
    }
  }

  // Garantir 2+2 com fallbacks neutros (sem inflacionar)
  while (strengths.length < 2) {
    strengths.push(
      strengths.length === 0
        ? { destaque: "Perfil ativo", detalhe: "presença regular na plataforma" }
        : { destaque: "Histórico consistente", detalhe: "base para iterar conteúdo" },
    );
  }
  while (limits.length < 2) {
    limits.push(
      limits.length === 0
        ? { destaque: "Espaço para diversificar", detalhe: "explorar novos formatos" }
        : { destaque: "Conversa por desenvolver", detalhe: "reforçar CTA nas legendas" },
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
}: EditorialIdentityCardProps) {
  const fallback = buildFallbackCopy(scores);
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
  );

  return (
    <article
      aria-label="Veredicto editorial"
      className="rounded-2xl border border-border-default bg-white shadow-card overflow-hidden"
    >
      {/* Zona macro */}
      <div className="px-6 py-7 flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-8">
        <div className="self-center sm:self-start shrink-0">
          <ScoreGauge value={overall} band={band} />
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-eyebrow-sm text-content-tertiary">Veredicto</span>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5",
                "text-xs font-semibold tracking-wide uppercase leading-none",
                bandBadgeClass(band),
              )}
            >
              {bandLabel(band)}
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
              Baseado em apenas {postsAnalyzed} posts — confiança limitada.
            </p>
          ) : (
            <ReferenceBar value={overall} reference={60} band={band} />
          )}
        </div>
      </div>

      {/* Zona accionável */}
      <div className="border-t border-border-default grid grid-cols-1 md:grid-cols-2">
        <BulletColumn
          tone="success"
          title="O que já funciona"
          items={strengths}
        />
        <BulletColumn
          tone="warning"
          title="O que limita o crescimento"
          items={limits}
          className="border-t md:border-t-0 md:border-l border-border-default"
        />
      </div>
    </article>
  );
}

/* ── Score Gauge ───────────────────────────────────────────────────── */

function ScoreGauge({ value, band }: { value: number; band: Band }) {
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
      aria-label={`Pontuação global ${clamped} de 100`}
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
        <span className="text-eyebrow-sm text-content-tertiary mt-1">de 100</span>
      </div>
    </div>
  );
}

/* ── Reference Bar ─────────────────────────────────────────────────── */

function ReferenceBar({
  value,
  reference,
  band,
}: {
  value: number;
  reference: number;
  band: Band;
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
        <span>↑ referência do escalão · {ref}</span>
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
