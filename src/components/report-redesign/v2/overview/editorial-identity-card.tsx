/**
 * Editorial Identity Card — Observação editorial (Block 1)
 *
 * Single-band executive observation:
 *   - Eyebrow "OBSERVAÇÃO"
 *   - Editorial title (≤ 5 words)
 *   - Short paragraph (2–3 sentences, pt-PT)
 *   - Optional subtle chip with benchmark position
 *
 * No new provider calls. Uses aiInsightsV2.hero.text when available,
 * deterministic fallback otherwise. Score ring and strength/weakness
 * mini-cards were removed to avoid duplicating the KPI grid and the
 * Engagement / Frequency / Format cards that follow.
 */
import { cn } from "@/lib/utils";
import type { ScoreKey } from "./score-utils";

/* ── Types ─────────────────────────────────────────────────────────── */

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

/* ── Benchmark anchor chip ─────────────────────────────────────────── */

function benchmarkChipLabel(
  keyMetrics: EditorialIdentityCardProps["keyMetrics"],
): string | null {
  if (!keyMetrics || keyMetrics.engagementBenchmark <= 0) return null;
  const delta = keyMetrics.engagementDeltaPct;
  if (delta >= 10) return "Acima do benchmark";
  if (delta <= -10) return "Abaixo do benchmark";
  return "Em linha com benchmark";
}

/* ── Main Component ────────────────────────────────────────────────── */

export function EditorialIdentityCard({
  scores,
  aiHeroText,
  keyMetrics,
}: EditorialIdentityCardProps) {
  const fallback = buildFallbackCopy(scores);
  const copy = aiHeroText ? deriveCopyFromAi(aiHeroText, fallback) : fallback;
  const chipLabel = benchmarkChipLabel(keyMetrics);
  const overall = Math.round(
    (scores.envolvimento.value + scores.frequencia.value + scores.interaccao.value) / 3,
  );

  return (
    <article
      aria-label="Observação editorial"
      className="rounded-2xl border border-border-default bg-white shadow-card overflow-hidden"
    >
      <div className="px-5 py-6 sm:px-7 sm:py-7 flex flex-col sm:flex-row sm:items-start sm:gap-8 gap-6">
        <div className="flex-1 min-w-0 space-y-3 order-1">
          <p className="text-eyebrow-sm text-content-tertiary">Observação</p>

          <h2 className="font-display text-xl sm:text-2xl font-semibold leading-[1.25] tracking-[-0.015em] text-content-primary max-w-2xl">
            {copy.title}
          </h2>

          <p className="text-sm leading-relaxed text-content-secondary max-w-2xl">
            {copy.paragraph}
          </p>

          {chipLabel && (
            <div className="pt-1">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-1",
                  "text-[11px] font-semibold tracking-wide uppercase leading-none",
                  "bg-surface-muted text-content-secondary",
                )}
              >
                {chipLabel}
              </span>
            </div>
          )}
        </div>

        <div className="order-2 self-center sm:self-start shrink-0">
          <ScoreRing value={overall} />
        </div>
      </div>
    </article>
  );
}

/* ── Score Ring ────────────────────────────────────────────────────── */

function ScoreRing({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const size = 140;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (clamped / 100) * c;

  const colorClass =
    clamped >= 70
      ? "text-accent-primary"
      : clamped >= 40
        ? "text-accent-primary/70"
        : "text-signal-warning";

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
          className={cn(colorClass, "transition-[stroke-dashoffset] duration-700")}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-sans text-3xl sm:text-4xl font-semibold tabular-nums leading-none text-content-primary">
          {clamped}
        </span>
        <span className="text-eyebrow-sm text-content-tertiary mt-1.5">Pontuação</span>
      </div>
    </div>
  );
}
