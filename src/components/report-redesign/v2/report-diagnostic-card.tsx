import { type ReactNode, useState } from "react";

import { cn } from "@/lib/utils";
import {
  MessagesSquare,
  MessageCircleMore,
  Target,
  MessageCircleOff,
  CircleHelp,
  Heart,
  MessageCircle,
  MessageCircleReply,

  MessageSquare,
  Users,
  HelpCircle,
  ThumbsUp,
  AlertTriangle,
  ShoppingCart,
  Zap,
  Calendar,
  Film,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import type { AudienceResponseStatus } from "@/lib/report/block02-diagnostic";
import type { CommentIntelligence } from "@/lib/analysis/types";
import { ReportSourceLabel, type ReportSourceType } from "./report-source-label";
import { InsightCallout } from "./insight-callout";

const CONVERSATION_SIGNAL_LABELS: Record<string, string> = {
  questions: "Perguntas",
  praise: "Elogios",
  buying: "Intenção de compra",
  complaints: "Problemas",
  spam: "Spam / baixa qualidade",
};

/**
 * Smart average formatting for PT locale:
 * 0        → "0"
 * 0 < v < 0.1 → "<0,1"
 * 0.1 ≤ v < 10 → one decimal (e.g. "0,1", "7,3")
 * v ≥ 10   → whole number
 */
function formatAvg(value: number): string {
  if (value === 0) return "0";
  if (value > 0 && value < 0.1) return "<0,1";
  if (value < 10) return value.toLocaleString("pt-PT", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return Math.round(value).toLocaleString("pt-PT");
}

export type DiagnosticTone = "blue" | "amber" | "rose" | "emerald" | "slate";

interface Props {
  /** Número visível do cartão, ex.: "01". */
  number: string;
  /** Etiqueta curta do tema da pergunta, ex.: "TIPO DE CONTEÚDO". */
  label: string;
  /** Pergunta humana — renderizada entre aspas. */
  question: string;
  /** Etiqueta do bloco de resposta dominante, ex.: "Resposta dominante". */
  answerLabel?: string;
  /** Resposta dominante curta. */
  answer: ReactNode;
  /** Slot opcional com gráfico, barras, ranking, mini-stats… */
  children?: ReactNode;
  /** Texto interpretativo curto. */
  body: ReactNode;
  tone?: DiagnosticTone;
  /** Layout span: "full" ocupa 2 colunas com layout horizontal, "half" (default) ocupa 1. */
  span?: "full" | "half";
  /**
   * Quando presente, renderiza um bloco "Leitura IA" abaixo do body,
   * com o texto curto vindo de `aiInsightsV2.sections.*`. Só passar
   * quando o texto vier mesmo da OpenAI.
   */
  aiSource?: { kind: "interpretation"; text: string } | null;
  /**
   * Tipo de evidência do cartão (ver `ReportSourceLabel`). Renderizado
   * como chip mono no header. Quando ausente, o cartão não mostra chip.
   */
  sourceType?: ReportSourceType;
  /** Detalhe curto à direita do tipo, ex.: "GOSTOS + COMENTÁRIOS". */
  sourceDetail?: string;
}

const TONE: Record<
  DiagnosticTone,
  { box: string; answerText: string; chip: string }
> = {
  blue: {
    box: "bg-tint-primary ring-accent-primary/15",
    answerText: "text-accent-primary",
    chip: "text-accent-primary",
  },
  emerald: {
    box: "bg-tint-success ring-signal-success/15",
    answerText: "text-signal-success",
    chip: "text-signal-success",
  },
  amber: {
    box: "bg-tint-warning ring-signal-warning/15",
    answerText: "text-signal-warning",
    chip: "text-signal-warning",
  },
  rose: {
    box: "bg-tint-danger ring-signal-danger/15",
    answerText: "text-signal-danger",
    chip: "text-signal-danger",
  },
  slate: {
    box: "bg-surface-muted ring-border-default",
    answerText: "text-content-primary",
    chip: "text-content-secondary",
  },
};

const ACCENT_BORDER: Record<DiagnosticTone, string> = {
  blue: "border-t-2 border-t-accent-primary/50",
  emerald: "border-t-2 border-t-signal-success/50",
  amber: "border-t-2 border-t-signal-warning/50",
  rose: "border-t-2 border-t-signal-danger/40",
  slate: "",
};

/**
 * Cartão de pergunta do Bloco 02. Estrutura:
 *   eyebrow (PERGUNTA NN · LABEL) + chip de proveniência (à direita)
 *   pergunta entre aspas (serif)
 *   bloco "Resposta dominante" colorido
 *   slot livre (children) com evidência
 *   body interpretativo curto
 *   bloco opcional "Leitura IA" (aiSource)
 */
export function ReportDiagnosticCard({
  number,
  label,
  question,
  answerLabel,
  answer,
  children,
  body,
  tone = "blue",
  span = "half",
  aiSource,
  sourceType,
  sourceDetail,
}: Props) {
  const t = TONE[tone];
  const isFull = span === "full";
  return (
    <article
      className={cn(
        "flex flex-col gap-5",
        isFull && "md:col-span-2",
        "rounded-2xl border border-border-default bg-surface-secondary",
        "p-4 sm:p-5 md:p-7",
        "shadow-card",
        ACCENT_BORDER[tone],
      )}
    >
      <div className="flex items-center justify-between gap-1.5 sm:gap-2 flex-wrap">
        <p className="text-eyebrow-sm text-content-tertiary min-w-0 tracking-[0.06em] text-xs sm:text-xs">
          P{number}
          <span className="mx-1.5 text-content-tertiary/40">·</span>
          <span className="text-content-tertiary">{label.toUpperCase()}</span>
        </p>
        {sourceType ? (
          <ReportSourceLabel
            type={sourceType}
            detail={sourceDetail}
          />
        ) : null}
      </div>

      {/* Full-width: vertical stack — answer block then children full-width */}
      {isFull ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3 sm:gap-4 max-w-2xl">
            <h3
              className={cn(
                "font-display text-[1.25rem] md:text-[1.5rem] font-semibold leading-snug tracking-tight text-content-primary break-words",
                "min-w-0",
              )}
            >
              {question}
            </h3>
            <div className={cn("rounded-xl ring-1 px-5 py-4", t.box)} aria-label={answerLabel}>
              <p
                className={cn(
                  "mt-1.5 font-display text-[1.75rem] md:text-[2rem] font-semibold tracking-[-0.02em] leading-tight",
                  t.answerText,
                )}
              >
                {answer}
              </p>
            </div>
            <p className="text-sm text-content-secondary leading-relaxed">{body}</p>
            {aiSource ? (
              <div className="border-t border-border-subtle pt-3 space-y-1.5">
                <div className="inline-flex items-center gap-2">
                  <ReportSourceLabel type="ia" />
                  <span className="text-eyebrow-sm text-content-tertiary">Interpretação</span>
                </div>
                <p className="text-sm text-content-secondary leading-relaxed italic">
                  {aiSource.text}
                </p>
              </div>
            ) : null}
          </div>
          {children ? <div className="min-w-0">{children}</div> : null}
        </div>
      ) : (
        /* Half-width: vertical stack (original layout with enlarged answer) */
        <>
          <h3
            className={cn(
              "font-display text-[1.25rem] md:text-[1.5rem] font-semibold leading-snug tracking-tight text-content-primary break-words",
              "min-w-0",
            )}
          >
            {question}
          </h3>

          <div className={cn("rounded-xl ring-1 px-3 py-2.5 sm:px-4 sm:py-3", t.box)} aria-label={answerLabel}>
            <p
              className={cn(
                "mt-1 font-display text-[1.25rem] sm:text-[1.5rem] md:text-[1.75rem] font-semibold tracking-[-0.015em] leading-tight",
                t.answerText,
              )}
            >
              {answer}
            </p>
          </div>

          {children ? <div className="min-w-0">{children}</div> : null}

          <p className="text-[13px] md:text-sm text-content-secondary leading-relaxed mt-auto">{body}</p>

          {aiSource ? (
            <div className="border-t border-border-subtle pt-3 space-y-1.5">
              <div className="inline-flex items-center gap-2">
                <ReportSourceLabel type="ia" />
                <span className="text-eyebrow-sm text-content-tertiary">Interpretação</span>
              </div>
              <p className="text-sm text-content-secondary leading-relaxed italic">
                {aiSource.text}
              </p>
            </div>
          ) : null}
        </>
      )}

    </article>
  );
}

/**
 * Barra horizontal simples para mostrar uma distribuição de % por
 * categoria. Usada nos cartões 03 (formato) e 01/02 quando aplicável.
 *
 * Variantes:
 *   - "stacked"      → uma única barra horizontal segmentada (Q03, Q02)
 *   - "vertical-list" → lista vertical: label · barra · valor (Q01)
 */
export function DiagnosticDistributionBar({
  items,
  variant = "stacked",
  valueFormat = "count",
}: {
  items: Array<{ label: string; sublabel?: string; value: number; count?: number; color?: string }>;
  variant?: "stacked" | "vertical-list";
  /** Como mostrar o valor na legenda. */
  valueFormat?: "count" | "percent";
}) {
  if (variant === "vertical-list") {
    const max = Math.max(1, ...items.map((it) => it.value));
    return (
      <ul className="space-y-2.5 sm:space-y-3">
        {items.map((it, i) => {
          const rawPct = (Math.max(0, it.value) / max) * 100;
          const pct = it.value > 0 ? Math.max(3, rawPct) : 0;
          const isDominant = i === 0;
          return (
            <li key={`${it.label}-${i}`} className="text-xs sm:text-sm">
              <div className="flex items-center gap-3">
                <span className={cn("min-w-[5.5rem] w-auto sm:min-w-[8.5rem] shrink-0 leading-tight text-content-secondary transition-colors", isDominant && "font-medium text-content-primary")}>
                  <span className="text-xs sm:text-sm">{it.label}</span>
                  {it.sublabel && (
                    <span className="hidden sm:block text-xs text-content-tertiary/70 leading-snug mt-0.5">{it.sublabel}</span>
                  )}
                </span>
                <div className={cn("flex-1 overflow-hidden rounded-full bg-surface-muted transition-all", isDominant ? "h-3" : "h-1.5")}>
                  <div
                    className={cn("h-full rounded-full transition-all", it.color ?? "bg-accent-primary", !isDominant && "opacity-30")}
                    style={{ width: `${pct}%` }}
                    aria-hidden
                  />
                </div>
                <span className={cn(
                  "w-10 shrink-0 text-right tabular-nums text-xs tabular-nums transition-colors",
                  isDominant ? "text-content-primary font-semibold" : "text-content-tertiary",
                )}>
                  {Math.round(it.value)}%
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  const total = Math.max(
    1,
    items.reduce((acc, it) => acc + Math.max(0, it.value), 0),
  );
  return (
    <div className="space-y-2.5">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
        {items.map((it, i) => (
          <div
            key={`${it.label}-${i}`}
            className={cn("h-full", it.color ?? "bg-accent-primary")}
            style={{ width: `${(Math.max(0, it.value) / total) * 100}%` }}
            aria-hidden
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {items.map((it, i) => (
          <li
            key={`${it.label}-${i}-legend`}
            className="inline-flex items-center gap-1.5 text-xs text-content-secondary"
          >
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                it.color ?? "bg-accent-primary",
              )}
            />
            <span className="font-medium text-content-primary">{it.label}</span>
            <span className="tabular-nums text-content-tertiary">
              {valueFormat === "percent"
                ? `${Math.round(it.value)}%`
                : it.count ?? Math.round(it.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Funil em barras horizontais empilhadas verticalmente (4 fases).
 * Cada fase é uma linha cheia com label dentro + % à direita.
 * Inspirado no mockup Q02.
 */
export function DiagnosticFunnelStack({
  items,
}: {
  items: Array<{
    stage: "topo" | "meio" | "fundo" | "pos";
    label: string;
    sharePct: number;
    active?: boolean;
  }>;
}) {
  /* Funnel tones — local map, softened for Iconosquare style.
   * Active uses accent-primary at varying opacity; idle uses surface-muted. */
  const STAGE_TONE: Record<
    "topo" | "meio" | "fundo" | "pos",
    { active: string; idle: string }
  > = {
    topo: { active: "bg-tint-success text-signal-success font-semibold", idle: "bg-tint-success/50 text-signal-success" },
    meio: { active: "bg-tint-success/80 text-signal-success", idle: "bg-tint-success/40 text-signal-success/80" },
    fundo: { active: "bg-tint-success/50 text-signal-success/70", idle: "bg-surface-muted text-content-secondary" },
    pos: { active: "bg-surface-muted text-content-secondary", idle: "bg-surface-muted text-content-tertiary" },
  };
  return (
    <ul className="space-y-2">
      {items.map((it) => {
        const tone = STAGE_TONE[it.stage];
        const active = it.active ?? it.sharePct >= 25;
        const isEmpty = it.sharePct === 0;
        return (
          <li key={it.stage} className="flex items-center gap-2.5">
            {isEmpty ? (
              <div
                className={cn(
                  "h-8 rounded-md flex items-center px-2.5 flex-1",
                  "text-eyebrow-sm",
                  "border border-dashed border-border-subtle text-content-tertiary/60",
                )}
              >
                {it.label}
              </div>
            ) : (
              <div className="flex-1 relative">
                <div
                  className={cn(
                    "h-8 rounded-md flex items-center px-2.5 transition-all",
                    "text-eyebrow-sm",
                    active ? tone.active : tone.idle,
                    active && "ring-1 ring-signal-success/20",
                  )}
                  style={{ width: `${Math.max(8, it.sharePct)}%`, minWidth: "fit-content" }}
                >
                  {it.label}
                </div>
              </div>
            )}
            <span className={cn(
              "w-10 shrink-0 text-right tabular-nums text-xs tabular-nums",
              isEmpty ? "text-content-tertiary/50" : "text-content-tertiary",
            )}>
              {it.sharePct}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Mini-stat (3 colunas curtas) usadas no cartão das captions.
 */
export function DiagnosticMiniStats({
  items,
}: {
  items: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
      {items.map((it, i) => (
        <div
          key={`${it.label}-${i}`}
          className="rounded-lg border border-border-subtle bg-surface-muted/60 px-2 py-2 sm:px-3 sm:py-2.5 text-center"
        >
          <p className="tabular-nums text-[13px] sm:text-[15px] font-semibold text-content-primary tabular-nums leading-none">
            {it.value}
          </p>
          <p className="text-eyebrow-sm mt-0.5 sm:mt-1 text-content-tertiary text-xs sm:text-xs">
            {it.label}
          </p>
        </div>
      ))}
    </div>
  );
}

/**
 * Checklist usada no cartão de integração entre canais.
 */
export function DiagnosticChecklist({
  items,
}: {
  items: Array<{ label: string; status: "detected" | "missing" | "partial"; hint?: string }>;
}) {
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => {
        const dot =
          it.status === "detected"
            ? "bg-signal-success"
            : it.status === "partial"
              ? "bg-signal-warning"
              : "bg-content-tertiary/40";
        const tag =
          it.status === "detected"
            ? "Detetado"
            : it.status === "partial"
              ? "Parcial"
              : "Ausente";
        return (
          <li
            key={`${it.label}-${i}`}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-3 py-2",
              it.status === "detected"
                ? "border-signal-success/15 bg-tint-success/30"
                : "border-border-subtle bg-surface-secondary",
            )}
          >
            <span aria-hidden className={cn("size-2 rounded-full shrink-0", dot)} />
            <span className="text-sm text-content-secondary min-w-0 truncate">
              {it.label}
              {it.hint ? (
                <span className="ml-1.5 text-content-tertiary">{it.hint}</span>
              ) : null}
            </span>
            <span className="text-eyebrow-sm ml-auto text-content-tertiary">
              {tag}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Ranking com barras horizontais (objetivo provável).
 * `valuePosition="left"` coloca o % antes da label, ao estilo do mockup Q08.
 */
export function DiagnosticRanking({
  items,
  valuePosition = "right",
}: {
  items: Array<{ label: string; score: number }>;
  valuePosition?: "left" | "right";
}) {
  const max = Math.max(1, ...items.map((i) => i.score));
  if (valuePosition === "left") {
    return (
      <ul className="space-y-2">
        {items.map((it, i) => {
          const pct = Math.round((it.score / max) * 100);
          return (
            <li key={`${it.label}-${i}`} className="text-sm">
              <div className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-right tabular-nums text-xs tabular-nums text-content-tertiary">
                  {pct}%
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className={cn("h-full bg-accent-primary", i > 0 && "opacity-30")}
                    style={{ width: `${pct}%` }}
                    aria-hidden
                  />
                </div>
                <span className="min-w-0 flex-1 truncate text-content-secondary">
                  {it.label}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={`${it.label}-${i}`} className="text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-content-secondary truncate">{it.label}</span>
            <span className="text-eyebrow-sm text-content-tertiary tabular-nums shrink-0">
              {Math.round((it.score / max) * 100)}%
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className={cn("h-full bg-accent-primary", i > 0 && "opacity-30")}
              style={{ width: `${(it.score / max) * 100}%` }}
              aria-hidden
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Q05 — 5-zone editorial layout ─────────────────────────────────

/**
 * P05 redesign: 5-zone editorial card for "O público responde ou só consome?"
 *
 * Z1 — Header + dominant answer (handled by ReportDiagnosticCard wrapper)
 * Z2 — Three KPI cards (gostos/post, comentários/post, respostas da marca)
 * Z3 — Conversation flow diagram ("Diagnóstico da Conversa")
 * Z4 — Highlighted top conversation post
 * Z5 — Works / Fails / Next
 */

interface AudienceHighlightProps {
  avgLikes: number;
  avgComments: number;
  commentsToLikesPct?: number;
  sampleSize?: number;
  totalLikes?: number | null;
  totalComments?: number | null;
  postsWithComments?: number;
  topConversationPost?: {
    index: number;
    comments: number;
    likes: number;
    captionExcerpt: string;
    format?: string | null;
    date?: string | null;
    commentsToLikesPct?: number;
  } | null;
  topCommentPosts?: Array<{
    index: number;
    comments: number;
    captionExcerpt: string;
    format?: string | null;
    date?: string | null;
    thumbnailUrl?: string | null;
    permalink?: string | null;
    shortcode?: string | null;
  }>;
  status?: AudienceResponseStatus;
  commentIntel?: CommentIntelligence | null;
  /** P04 cross-reference: caption comment engagement strategy */
  captionEngagementStrategy?: "active" | "occasional" | "passive" | null;
  /** P04 cross-reference: % of posts that explicitly ask for comments */
  captionAsksForCommentsPct?: number | null;
}

export function DiagnosticAudienceHighlight({
  avgLikes,
  avgComments,
  commentsToLikesPct,
  sampleSize,
  totalLikes,
  totalComments,
  postsWithComments,
  topConversationPost,
  topCommentPosts,
  status = "silent",
  commentIntel,
  captionEngagementStrategy,
  captionAsksForCommentsPct,
}: AudienceHighlightProps) {
  const ownerReplies = commentIntel?.available ? commentIntel.ownerRepliesCount : 0;
  const sampleComments = commentIntel?.available ? commentIntel.sampleComments : null;
  const ownerReplyRatePct = commentIntel?.available ? commentIntel.ownerReplyRatePct : null;

  /* Determine if KPI 2 and KPI 3 are in alert state */
  const commentsIsAlert = avgComments < 1;
  const repliesIsAlert = ownerReplies === 0;

  /* Z3 comment subcopy */
  const commentSubcopy = (() => {
    if (postsWithComments != null && sampleSize != null && sampleSize > 0) {
      if (postsWithComments === 0) return `0 em ${sampleSize} posts · quase nada`;
      return `${postsWithComments} de ${sampleSize} posts com comentários`;
    }
    if (avgComments < 0.5) return "quase nenhum comentário";
    return `${formatAvg(avgComments)} por post`;
  })();

  return (
    <div className="space-y-4">
      {/* ── Z2: Three KPI cards ── */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
        {/* KPI 1 — Gostos / post (neutral) */}
        <div className="rounded-[14px] border border-border-subtle bg-surface-muted/70 px-2.5 py-3 sm:px-4 sm:py-3.5 flex flex-col gap-1 sm:gap-1.5">
          <div className="flex items-center gap-1.5">
            <Heart size={14} className="text-content-tertiary" strokeWidth={1.5} />
            <span className="text-eyebrow-sm text-content-tertiary text-xs sm:text-xs">Gostos / post</span>
          </div>
          <span className="tabular-nums text-[20px] sm:text-[28px] font-semibold tabular-nums text-content-primary leading-none">
            {formatAvg(avgLikes)}
          </span>
          <span className="text-xs sm:text-xs text-content-tertiary">
            {totalLikes != null
              ? `${totalLikes.toLocaleString("pt-PT")} gostos no total`
              : "por publicação"}
          </span>
        </div>

        {/* KPI 2 — Comentários / post (alert when < 1) */}
        <div
          className={cn(
            "rounded-[14px] border px-2.5 py-3 sm:px-4 sm:py-3.5 flex flex-col gap-1 sm:gap-1.5",
            commentsIsAlert
              ? "border-signal-danger/20 bg-tint-danger"
              : "border-border-subtle bg-surface-muted/70",
          )}
        >
          <div className="flex items-center gap-1.5">
            <MessageCircle
              size={14}
              className={commentsIsAlert ? "text-signal-danger" : "text-content-tertiary"}
              strokeWidth={1.5}
            />
            <span className="text-eyebrow-sm text-content-tertiary text-xs sm:text-xs">Coment. / post</span>
            {commentsIsAlert && (
              <span className="ml-auto text-xs font-semibold uppercase tracking-wider text-signal-danger bg-signal-danger/10 rounded-full px-1.5 py-0.5">
                Alerta
              </span>
            )}
          </div>
          <span
            className={cn(
              "tabular-nums text-[20px] sm:text-[28px] font-semibold tabular-nums leading-none",
              commentsIsAlert ? "text-signal-danger" : "text-content-primary",
            )}
          >
            {formatAvg(avgComments)}
          </span>
          <span className="text-xs sm:text-xs text-content-tertiary">
            {sampleSize != null && sampleSize < 5
              ? "Base pequena para avaliar conversão de gostos em comentários."
              : commentsToLikesPct != null && commentsToLikesPct > 0
                ? commentsToLikesPct < 0.5
                  ? "baixa conversão de gostos em comentários"
                  : `${commentsToLikesPct < 0.1 ? "<0,1" : commentsToLikesPct.toLocaleString("pt-PT", { maximumFractionDigits: 1 })}% dos gostos geraram comentário`
                : sampleSize ? `em ${sampleSize} publicações` : "por publicação"}
          </span>
        </div>

        {/* KPI 3 — Respostas da marca (alert when 0) */}
        <div
          className={cn(
            "rounded-[14px] border px-2.5 py-3 sm:px-4 sm:py-3.5 flex flex-col gap-1 sm:gap-1.5",
            repliesIsAlert
              ? "border-signal-danger/20 bg-tint-danger"
              : "border-border-subtle bg-surface-muted/70",
          )}
        >
          <div className="flex items-center gap-1.5">
            <MessageCircleReply
              size={14}
              className={repliesIsAlert ? "text-signal-danger" : "text-content-tertiary"}
              strokeWidth={1.5}
            />
            <span className="text-eyebrow-sm text-content-tertiary text-xs sm:text-xs">
              <span className="hidden sm:inline">Respostas da marca</span>
              <span className="sm:hidden">Respostas</span>
            </span>
            {repliesIsAlert && (
              <span className="ml-auto text-xs font-semibold uppercase tracking-wider text-signal-danger bg-signal-danger/10 rounded-full px-1.5 py-0.5">
                Alerta
              </span>
            )}
          </div>
          <span
            className={cn(
              "tabular-nums text-[20px] sm:text-[28px] font-semibold tabular-nums leading-none",
              repliesIsAlert ? "text-signal-danger" : "text-content-primary",
            )}
          >
            {ownerReplyRatePct != null && ownerReplyRatePct > 0
              ? `${Math.round(ownerReplyRatePct)}%`
              : ownerReplies}
          </span>
          <span className="text-xs sm:text-xs text-content-tertiary">
            {ownerReplies === 0
              ? "a marca não conversa"
              : ownerReplyRatePct != null && ownerReplyRatePct > 0
                ? `${ownerReplies} respostas públicas`
                : "respostas públicas detetadas"}
          </span>
        </div>
      </div>

      {/* ── Z3: Voz da audiência — o que dizem nos comentários ── */}
      {commentIntel?.available && (commentIntel.questionsFromAudienceCount > 0 || commentIntel.praiseCount > 0 || commentIntel.buyingIntentCount > 0 || commentIntel.complaintOrIssueCount > 0) ? (
        <AudienceVoiceBreakdown commentIntel={commentIntel} />
      ) : (
        <div className="rounded-[14px] border border-border-subtle bg-surface-muted/50 px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-eyebrow text-content-tertiary mb-2">Voz da audiência</p>
          <p className="text-[13px] text-content-secondary leading-relaxed">
            Quando a análise de comentários estiver disponível, este bloco mostra o que a audiência mais pede, elogia e questiona nos comentários públicos.
          </p>
        </div>
      )}

      {/* ── P04 cross-reference: caption engagement strategy ── */}
      {captionEngagementStrategy && (
        <div className="rounded-lg border border-border-subtle bg-surface-muted/50 px-3.5 py-2.5 space-y-1">
          <div className="flex items-center gap-2">
            <Zap size={13} className="text-content-tertiary shrink-0" strokeWidth={1.5} />
            <p className="text-[12px] text-content-secondary leading-snug">
              {captionAsksForCommentsPct != null
                ? `As legendas pedem comentários em ${Math.round(captionAsksForCommentsPct)}% dos posts.`
                : captionEngagementStrategy === "active"
                  ? "As legendas pedem comentários de forma ativa."
                  : captionEngagementStrategy === "passive"
                    ? "As legendas raramente pedem comentários."
                    : "Convite à conversa ocasional."}
            </p>
          </div>
          {(() => {
            const asksPctLow = captionAsksForCommentsPct == null || captionAsksForCommentsPct < 25;
            const hasConversation = postsWithComments != null && sampleSize != null && sampleSize > 0 && postsWithComments / sampleSize > 0.4;
            const lowConversation = avgComments < 2;
            if (asksPctLow && hasConversation) {
              return <p className="text-xs text-content-tertiary leading-snug pl-[21px]">A conversa surge mesmo sem convite explícito nas legendas.</p>;
            }
            if (asksPctLow && lowConversation) {
              return <p className="text-xs text-content-tertiary leading-snug pl-[21px]">Há margem para testar perguntas finais nas legendas.</p>;
            }
            if (!asksPctLow && lowConversation) {
              return <p className="text-xs text-content-tertiary leading-snug pl-[21px]">O convite existe, mas ainda não gera resposta consistente.</p>;
            }
            return null;
          })()}
        </div>
      )}

      {/* ── Z4: Top conversation posts (compact thumb cards) ── */}
      <TopConversationPostsGrid
        topCommentPosts={topCommentPosts}
        commentIntel={commentIntel}
      />

      {/* ── Methodology footer ── */}
      {status !== "unavailable" && (
        <p className="text-[10.5px] text-content-tertiary italic leading-relaxed">
          {sampleSize ?? "—"} posts analisados
          {postsWithComments != null && ` · ${postsWithComments} ${postsWithComments === 1 ? "post com comentários" : "posts com comentários"}`}
          {totalComments != null && totalComments > 0 && ` · ${totalComments} ${totalComments === 1 ? "comentário público" : "comentários públicos"}`}
          {sampleComments != null && totalComments != null && sampleComments !== totalComments && ` · ${sampleComments} recolhidos para análise · amostra parcial`}
          {" "}· sem DMs nem comentários ocultos
        </p>
      )}
    </div>
  );
}

// ─── Q07 — Síntese de objetivo estratégico ──────────────────────────

export interface ObjectiveSynthesisProps {
  primary: string;
  secondary?: string | null;
  confidence: "low" | "med";
  supportSignals: string[];
  ranking?: Array<{ label: string; score: number }>;
}

const CONFIDENCE_COPY: Record<"low" | "med", { label: string; cls: string }> = {
  med: { label: "Confiança média", cls: "text-accent-primary bg-tint-primary ring-accent-primary/15" },
  low: { label: "Confiança baixa", cls: "text-content-secondary bg-surface-muted ring-border-default" },
};

/**
 * Layout de síntese estratégica para Q07 — substitui as barras de ranking
 * percentuais por uma apresentação de hipótese principal + secundária +
 * sinais de suporte + nível de confiança.
 */
export function DiagnosticObjectiveSynthesis({
  primary,
  secondary,
  confidence,
  supportSignals,
  ranking,
}: ObjectiveSynthesisProps) {
  const conf = CONFIDENCE_COPY[confidence];
  const maxScore = ranking ? Math.max(1, ...ranking.map((r) => r.score)) : 0;
  return (
    <div className="space-y-4">
      {/* Ranking bars — visual scoring of all objectives */}
      {ranking && ranking.length > 1 ? (
        <div className="space-y-2">
          <p className="text-eyebrow-sm text-content-tertiary">Ranking de objetivos</p>
          <ul className="space-y-1">
            {ranking.map((item) => {
              const pct = Math.round((item.score / maxScore) * 100);
              const isPrimary = item.label === primary;
              return (
                <li key={item.label} className="text-sm">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "w-[6rem] sm:w-32 shrink-0 truncate text-[12px]",
                      isPrimary ? "font-medium text-content-primary" : "text-content-tertiary",
                    )}>
                      {item.label}
                    </span>
                    <div className={cn(
                      "flex-1 overflow-hidden rounded-full",
                      isPrimary ? "h-2 bg-purple-100" : "h-1.5 bg-surface-muted",
                    )}>
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isPrimary ? "bg-purple-500" : "bg-content-tertiary/30",
                        )}
                        style={{ width: `${pct}%` }}
                        aria-hidden
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right tabular-nums text-xs tabular-nums text-content-tertiary">
                      {item.score}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* Support signals */}
      {supportSignals.length > 0 ? (
        <div className="space-y-1.5">
          <div className="flex flex-wrap gap-2">
            {supportSignals.map((signal) => (
              <span
                key={signal}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
                  "ring-1 ring-border-default bg-surface-muted",
                  "text-[12px] text-content-secondary",
                )}
              >
                <span className="size-1 rounded-full bg-content-tertiary/40 shrink-0" aria-hidden />
                {signal}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* Confidence chip */}
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full ring-1 px-2.5 py-1",
          "text-[12px] font-medium",
          conf.cls,
        )}
      >
        {conf.label}
      </span>

      {/* Methodology footer */}
      <p className="text-[10.5px] text-content-tertiary italic leading-relaxed">
        Hipótese derivada dos sinais públicos analisados.
      </p>
    </div>
  );
}

// ─── Z3 replacement: Audience Voice Breakdown ───────────────────────

function AudienceVoiceBreakdown({ commentIntel }: { commentIntel: CommentIntelligence }) {
  const ci = commentIntel;
  const totalSignals = ci.questionsFromAudienceCount + ci.praiseCount + ci.buyingIntentCount + ci.complaintOrIssueCount;
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Map signal keys to excerpt arrays
  const excerptMap: Record<string, Array<{ username: string; text: string }>> = {
    questions: ci.classifiedExcerpts?.questions ?? [],
    praise: ci.classifiedExcerpts?.praise ?? [],
    complaints: ci.classifiedExcerpts?.complaints ?? [],
    buying: ci.classifiedExcerpts?.buyingIntent ?? [],
  };

  const items: Array<{
    key: string;
    label: string;
    sublabel: string;
    count: number;
    pct: number;
    Icon: typeof HelpCircle;
    toneClass: string;
    barClass: string;
  }> = [];

  if (ci.questionsFromAudienceCount > 0) {
    items.push({
      key: "questions",
      label: "Perguntas",
      sublabel: "Dúvidas, pedidos de informação, \"como faço?\"",
      count: ci.questionsFromAudienceCount,
      pct: totalSignals > 0 ? Math.round((ci.questionsFromAudienceCount / totalSignals) * 100) : 0,
      Icon: HelpCircle,
      toneClass: "text-accent-primary",
      barClass: "bg-accent-primary",
    });
  }
  if (ci.praiseCount > 0) {
    items.push({
      key: "praise",
      label: "Elogios e apoio",
      sublabel: "Parabéns, emojis positivos, incentivos",
      count: ci.praiseCount,
      pct: totalSignals > 0 ? Math.round((ci.praiseCount / totalSignals) * 100) : 0,
      Icon: ThumbsUp,
      toneClass: "text-signal-success",
      barClass: "bg-signal-success",
    });
  }
  if (ci.buyingIntentCount > 0) {
    items.push({
      key: "buying",
      label: "Intenção de compra",
      sublabel: "\"Onde compro?\", \"Qual o preço?\", pedidos de link",
      count: ci.buyingIntentCount,
      pct: totalSignals > 0 ? Math.round((ci.buyingIntentCount / totalSignals) * 100) : 0,
      Icon: ShoppingCart,
      toneClass: "text-accent-primary",
      barClass: "bg-accent-primary/70",
    });
  }
  if (ci.complaintOrIssueCount > 0) {
    items.push({
      key: "complaints",
      label: "Problemas ou queixas",
      sublabel: "Reclamações, insatisfação, pedidos de suporte",
      count: ci.complaintOrIssueCount,
      pct: totalSignals > 0 ? Math.round((ci.complaintOrIssueCount / totalSignals) * 100) : 0,
      Icon: AlertTriangle,
      toneClass: "text-signal-warning",
      barClass: "bg-signal-warning",
    });
  }

  // Sort by count descending
  items.sort((a, b) => b.count - a.count);

  const max = Math.max(1, ...items.map((i) => i.count));

  return (
    <div className="rounded-[14px] border border-border-default bg-surface-secondary px-4 py-4 sm:px-5 sm:py-5 space-y-4">
      <div>
        <p className="text-eyebrow text-content-tertiary">O que a audiência mais diz</p>
        <p className="text-xs text-content-tertiary mt-0.5">
          Classificação automática de {ci.audienceCommentsCount.toLocaleString("pt-PT")} comentários
          {ci.uniqueAudienceCommentersCount > 0 && ` de ${ci.uniqueAudienceCommentersCount.toLocaleString("pt-PT")} pessoas`}
          {" "}· percentagens sobre sinais classificados
        </p>
        {ci.postsWithConversationPct > 0 && ci.samplePosts >= 3 ? (
          <p className="text-xs text-content-tertiary/70 mt-0.5">
            Conversa presente em {Math.round(ci.postsWithConversationPct)}% dos posts analisados
            {ci.uniqueAudienceCommentersCount > 1 && ci.audienceCommentsCount > ci.uniqueAudienceCommentersCount
              ? ` · ~${(ci.audienceCommentsCount / ci.uniqueAudienceCommentersCount).toFixed(1).replace(".", ",")} comentários por pessoa`
              : ""}
          </p>
        ) : ci.samplePosts < 3 ? (
          <p className="text-xs text-content-tertiary/70 mt-0.5">
            Amostra de comentários curta — leitura qualitativa.
          </p>
        ) : null}
        {totalSignals < 5 && totalSignals > 0 && (
          <p className="text-xs text-content-tertiary/70 mt-0.5 italic">
            Percentagens baseadas numa amostra pequena de sinais classificados.
          </p>
        )}
      </div>

      <ul className="space-y-3">
        {items.map((it, i) => {
          const barW = Math.max(8, (it.count / max) * 100);
          const excerpts = excerptMap[it.key] ?? [];
          const isExpanded = expandedKey === it.key;
          const hasExcerpts = excerpts.length > 0;
          return (
            <li key={it.key}>
              <button
                type="button"
                className={cn("flex items-start gap-2.5 w-full text-left", hasExcerpts && "cursor-pointer")}
                onClick={() => hasExcerpts && setExpandedKey(isExpanded ? null : it.key)}
                disabled={!hasExcerpts}
              >
                <div className={cn("size-7 sm:size-8 rounded-lg flex items-center justify-center shrink-0 bg-surface-muted")}>
                  <it.Icon className={cn("size-3.5 sm:size-4", it.toneClass)} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] sm:text-[14px] font-semibold text-content-primary">{it.label}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="tabular-nums text-[13px] sm:text-[15px] font-bold tabular-nums text-content-primary">{it.count}</span>
                      <span className="tabular-nums text-xs tabular-nums text-content-tertiary">({it.pct}%)</span>
                      {hasExcerpts && (
                        isExpanded
                          ? <ChevronUp size={14} className="text-content-tertiary ml-1" strokeWidth={1.5} />
                          : <ChevronDown size={14} className="text-content-tertiary ml-1" strokeWidth={1.5} />
                      )}
                    </div>
                  </div>
                  <p className="text-xs sm:text-[12px] text-content-tertiary leading-snug mt-0.5">{it.sublabel}</p>
                  <div className="h-1.5 sm:h-2 rounded-full bg-surface-muted mt-2 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", it.barClass, i > 0 && "opacity-60")}
                      style={{ width: `${barW}%` }}
                    />
                  </div>
                </div>
              </button>
              {isExpanded && excerpts.length > 0 && (
                <ul className="mt-2 ml-[36px] sm:ml-[40px] space-y-1.5 rounded-lg bg-surface-muted/60 border border-border-subtle px-3 py-2.5">
                  {excerpts.map((ex, j) => (
                    <li key={j} className="text-[12px] leading-snug">
                      <span className="font-semibold text-content-secondary">@{ex.username}</span>
                      <span className="text-content-tertiary ml-1">«{ex.text}»</span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {!ci.classifiedExcerpts && totalSignals > 0 && (
        <p className="text-xs text-content-tertiary/60 italic">
          Exemplos de comentários disponíveis apenas em novas análises.
        </p>
      )}

      {ci.recommendedConversationAction && (
        <div className="rounded-lg bg-tint-primary px-3.5 py-3 border border-accent-primary/15">
          <p className="text-eyebrow-sm text-accent-primary mb-1">Ação recomendada</p>
          <p className="text-[13px] text-content-secondary leading-relaxed">{ci.recommendedConversationAction}</p>
        </div>
      )}

      {/* Sinais dominantes de conversa */}
      {ci.dominantConversationSignals?.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          <span className="text-xs text-content-tertiary mr-1">Sinais dominantes:</span>
          {ci.dominantConversationSignals.map((signal) => (
            <span
              key={signal}
              className="inline-flex items-center rounded-full bg-surface-muted border border-border-subtle px-2 py-0.5 text-xs font-medium text-content-secondary"
            >
              {CONVERSATION_SIGNAL_LABELS[signal] ?? signal}
            </span>
          ))}
        </div>
      )}

      {/* Comentários que pedem ação */}
      {(() => {
        const qCount = ci.questionsFromAudienceCount;
        const bCount = ci.buyingIntentCount;
        const cCount = ci.complaintOrIssueCount;
        const actionable = qCount + bCount + cCount;
        if (actionable <= 0 || totalSignals <= 0) return null;

        // Determine dominant category for insight
        const dominant = [
          { key: "questions", count: qCount, insight: "A maioria são perguntas — considere um FAQ nos destaques ou respostas públicas." },
          { key: "buying", count: bCount, insight: "Há intenção de compra nos comentários — facilite o acesso ao produto ou serviço." },
          { key: "complaints", count: cCount, insight: "Existem queixas nos comentários — priorize resposta para proteger a reputação." },
        ].sort((a, b) => b.count - a.count)[0];

        const parts: string[] = [];
        if (qCount > 0) parts.push(`${qCount} ${qCount === 1 ? "pergunta" : "perguntas"}`);
        if (bCount > 0) parts.push(`${bCount} intenção de compra`);
        if (cCount > 0) parts.push(`${cCount} ${cCount === 1 ? "problema" : "problemas"}`);

        return (
          <div className="flex items-center gap-2.5 rounded-lg border border-border-subtle bg-surface-muted/60 px-3.5 py-2.5">
            <Zap size={13} className="text-accent-primary shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-[13px] font-semibold text-content-primary">
                {actionable} {actionable === 1 ? "comentário" : "comentários"} com oportunidade
              </p>
              <p className="text-xs text-content-tertiary">
                {ci.audienceCommentsCount > 0 && `${Math.round((actionable / ci.audienceCommentsCount) * 100)}% dos comentários da audiência · `}
                {parts.join(" · ")}
              </p>
              {dominant && dominant.count > 0 && (
                <p className="text-xs text-content-secondary leading-snug mt-1">
                  {dominant.insight}
                </p>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Z4: Top conversation posts — compact thumbnail cards ──────────

type DominantSignal = "questions" | "praise" | "complaints" | "buying_intent" | "mixed";

const SIGNAL_CHIP: Record<DominantSignal, {
  label: string;
  Icon: typeof HelpCircle;
  className: string;
}> = {
  questions: { label: "Perguntas", Icon: HelpCircle, className: "text-accent-primary bg-tint-primary border-accent-primary/20" },
  praise: { label: "Elogios", Icon: ThumbsUp, className: "text-signal-success bg-tint-success border-signal-success/20" },
  complaints: { label: "Queixas", Icon: AlertTriangle, className: "text-signal-warning bg-tint-warning border-signal-warning/20" },
  buying_intent: { label: "Intenção de compra", Icon: ShoppingCart, className: "text-accent-primary bg-tint-primary border-accent-primary/20" },
  mixed: { label: "Conversa mista", Icon: MessageCircle, className: "text-content-secondary bg-surface-muted border-border-default" },
};

interface LegacyTopPost {
  index: number;
  comments: number;
  captionExcerpt: string;
  format?: string | null;
  date?: string | null;
  thumbnailUrl?: string | null;
  permalink?: string | null;
  shortcode?: string | null;
}

function extractShortcodeFromUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m?.[1];
}

function TopConversationPostsGrid({
  topCommentPosts,
  commentIntel,
}: {
  topCommentPosts?: LegacyTopPost[];
  commentIntel?: CommentIntelligence | null;
}) {
  // Build a shortcode → enriched-entry lookup from commentIntel when available
  const ciByShortcode = new Map<
    string,
    NonNullable<CommentIntelligence["topConversationPosts"]>[number]
  >();
  if (commentIntel?.available && commentIntel.topConversationPosts) {
    for (const entry of commentIntel.topConversationPosts) {
      const sc = entry.shortcode ?? extractShortcodeFromUrl(entry.postUrl);
      if (sc) ciByShortcode.set(sc, entry);
    }
  }

  // Compose card list: prefer commentIntel.topConversationPosts when present
  // (richer per-post signal data + thumbnails joined via shortcode), else
  // fall back to legacy `topCommentPosts` derived from comment volume.
  type Card = {
    key: string;
    permalink: string | null;
    thumbnailUrl: string | null;
    format: string | null;
    date: string | null;
    captionExcerpt: string;
    commentsCount: number;
    ownerReplies?: number;
    signal?: DominantSignal;
    summary?: string;
    topAudienceComment?: { username: string; text: string };
  };

  const legacyByShortcode = new Map<string, LegacyTopPost>();
  for (const p of topCommentPosts ?? []) {
    const sc = p.shortcode ?? extractShortcodeFromUrl(p.permalink);
    if (sc) legacyByShortcode.set(sc, p);
  }

  let cards: Card[] = [];
  if (commentIntel?.available && commentIntel.topConversationPosts && commentIntel.topConversationPosts.length > 0) {
    cards = commentIntel.topConversationPosts.slice(0, 3).map((entry, idx) => {
      const sc = entry.shortcode ?? extractShortcodeFromUrl(entry.postUrl);
      const legacy = sc ? legacyByShortcode.get(sc) : undefined;
      return {
        key: sc ?? `ci-${idx}`,
        permalink: entry.postUrl || legacy?.permalink || null,
        thumbnailUrl: entry.thumbnailUrl ?? legacy?.thumbnailUrl ?? null,
        format: legacy?.format ?? null,
        date: legacy?.date ?? null,
        captionExcerpt: legacy?.captionExcerpt ?? "",
        commentsCount: entry.audienceCommentsCount || entry.commentsCount || legacy?.comments || 0,
        ownerReplies: entry.ownerRepliesCount,
        signal: entry.dominantSignal,
        summary: entry.summary,
        topAudienceComment: entry.topAudienceComment,
      };
    });
  } else if (topCommentPosts && topCommentPosts.length > 0) {
    cards = topCommentPosts.slice(0, 3).map((p, idx) => ({
      key: p.shortcode ?? `legacy-${idx}`,
      permalink: p.permalink ?? null,
      thumbnailUrl: p.thumbnailUrl ?? null,
      format: p.format ?? null,
      date: p.date ?? null,
      captionExcerpt: p.captionExcerpt,
      commentsCount: p.comments,
    }));
  }

  if (cards.length === 0) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="text-[14px] sm:text-[15px] font-semibold text-content-primary leading-tight">
          Posts que geraram mais conversa
        </h4>
        <span className="text-xs text-content-tertiary tabular-nums">
          Top {cards.length}
        </span>
      </div>
      <p className="text-xs text-content-tertiary">
        Ranking por volume de conversa pública{commentIntel?.available ? " e respostas da marca" : ""}.
      </p>
      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {cards.map((card) => {
          const Wrapper = (card.permalink ? "a" : "div") as "a" | "div";
          const wrapperProps = card.permalink
            ? { href: card.permalink, target: "_blank" as const, rel: "noopener noreferrer" }
            : {};
          const chip = card.signal ? SIGNAL_CHIP[card.signal] : null;
          return (
            <li key={card.key} className="contents">
              <Wrapper
                {...wrapperProps}
                className="group flex gap-2.5 rounded-xl border border-border-default bg-surface-secondary p-2.5 transition-all duration-200 hover:ring-1 hover:ring-accent-primary/30 hover:border-accent-primary/40"
              >
                {/* Compact square thumbnail */}
                <div className="relative size-[88px] shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                  {card.thumbnailUrl ? (
                    <img
                      src={card.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <MessageCircle className="size-6 text-content-tertiary/40" strokeWidth={1.5} />
                    </div>
                  )}
                  {card.permalink && (
                    <span className="absolute top-1 right-1 z-10 flex items-center justify-center size-5 rounded-full bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="size-2.5 text-white" />
                    </span>
                  )}
                </div>
                {/* Content */}
                <div className="flex flex-1 min-w-0 flex-col gap-1">
                  {chip ? (
                    <span className={cn(
                      "inline-flex items-center gap-1 self-start rounded-full border px-1.5 py-0.5 text-[10.5px] font-medium",
                      chip.className,
                    )}>
                      <chip.Icon className="size-2.5 shrink-0" aria-hidden="true" />
                      <span className="truncate max-w-[100px]">{chip.label}</span>
                    </span>
                  ) : (
                    card.date && (
                      <span className="text-[10.5px] uppercase tracking-wide text-content-tertiary">
                        {new Date(card.date).toLocaleDateString("pt-PT", { day: "numeric", month: "short" })}
                      </span>
                    )
                  )}
                  <p className="text-[12px] text-content-secondary leading-snug line-clamp-2">
                    {card.summary ?? card.topAudienceComment?.text ?? card.captionExcerpt ?? "Sem detalhe textual disponível."}
                  </p>
                  <div className="mt-auto flex items-center gap-2 text-[11.5px] text-content-tertiary tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="size-3 text-accent-primary" strokeWidth={1.5} />
                      <span className="font-semibold text-content-primary">{card.commentsCount.toLocaleString("pt-PT")}</span>
                      <span>com.</span>
                    </span>
                    {typeof card.ownerReplies === "number" && (
                      <span className="inline-flex items-center gap-1">
                        <MessageCircleReply className="size-3" strokeWidth={1.5} />
                        <span className="font-semibold text-content-primary">{card.ownerReplies}</span>
                        <span>resp.</span>
                      </span>
                    )}
                  </div>
                </div>
              </Wrapper>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
