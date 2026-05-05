import type { ReactNode } from "react";

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
  ArrowRight,
  CheckCircle2,
  XCircle,
  Lightbulb,
  MessageSquare,
  Users,
} from "lucide-react";
import type { AudienceResponseStatus } from "@/lib/report/block02-diagnostic";
import type { CommentIntelligence } from "@/lib/analysis/types";
import { ReportSourceLabel, type ReportSourceType } from "./report-source-label";
import { InsightCallout } from "./insight-callout";

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
        "p-5 md:p-7",
        "shadow-card",
        ACCENT_BORDER[tone],
      )}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-eyebrow-sm text-content-tertiary min-w-0 tracking-[0.06em]">
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
          <div className="flex flex-col gap-4 max-w-2xl">
            <h3
              className={cn(
                "font-display text-[1.25rem] md:text-[1.375rem] font-semibold leading-snug tracking-tight text-content-primary",
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
              "font-display text-[1.125rem] md:text-[1.25rem] font-semibold leading-snug tracking-tight text-content-primary",
              "min-w-0",
            )}
          >
            {question}
          </h3>

          <div className={cn("rounded-xl ring-1 px-4 py-3", t.box)} aria-label={answerLabel}>
            <p
              className={cn(
                "mt-1 font-display text-[1.5rem] md:text-[1.75rem] font-semibold tracking-[-0.015em] leading-tight",
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
  items: Array<{ label: string; value: number; count?: number; color?: string }>;
  variant?: "stacked" | "vertical-list";
  /** Como mostrar o valor na legenda. */
  valueFormat?: "count" | "percent";
}) {
  if (variant === "vertical-list") {
    const max = Math.max(1, ...items.map((it) => it.value));
    return (
      <ul className="space-y-2">
        {items.map((it, i) => {
          const pct = (Math.max(0, it.value) / max) * 100;
          const isDominant = i === 0;
          return (
            <li key={`${it.label}-${i}`} className="text-sm">
              <div className="flex items-center gap-3">
                <span className={cn("min-w-[4.5rem] w-auto sm:min-w-[7rem] shrink-0 text-[12px] sm:text-sm leading-tight text-content-secondary", isDominant && "font-medium text-content-primary")}>
                  {it.label}
                </span>
                <div className={cn("flex-1 overflow-hidden rounded-full bg-surface-muted", isDominant ? "h-2.5" : "h-2")}>
                  <div
                    className={cn("h-full", it.color ?? "bg-accent-primary", !isDominant && "opacity-25")}
                    style={{ width: `${pct}%` }}
                    aria-hidden
                  />
                </div>
                <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-content-tertiary">
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
    <ul className="space-y-1.5">
      {items.map((it) => {
        const tone = STAGE_TONE[it.stage];
        const active = it.active ?? it.sharePct >= 25;
        const width = Math.max(8, it.sharePct);
        return (
          <li key={it.stage} className="relative">
            <div
              className={cn(
                "h-7 rounded-md flex items-center px-2.5",
                "text-eyebrow-sm",
                active ? tone.active : tone.idle,
              )}
              style={{ width: `${width}%`, minWidth: "fit-content" }}
            >
              {it.label}
            </div>
            <span className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[11px] tabular-nums text-content-tertiary">
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
    <div className="grid grid-cols-3 gap-2">
      {items.map((it, i) => (
        <div
          key={`${it.label}-${i}`}
          className="rounded-lg border border-border-subtle bg-surface-muted/60 px-3 py-2.5 text-center"
        >
          <p className="font-mono text-[15px] font-semibold text-content-primary tabular-nums leading-none">
            {it.value}
          </p>
          <p className="text-eyebrow-sm mt-1 text-content-tertiary">
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
                <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-content-tertiary">
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
  sampleSize?: number;
  totalLikes?: number | null;
  postsWithComments?: number;
  topConversationPost?: {
    index: number;
    comments: number;
    likes: number;
    captionExcerpt: string;
  } | null;
  status?: AudienceResponseStatus;
  commentIntel?: CommentIntelligence | null;
}

/* ── Z5 copy maps (status-driven) ── */

const WORKS_MAP: Record<AudienceResponseStatus, string> = {
  active: "O conteúdo gera reações e conversa pública consistente — há audiência viva e participativa.",
  moderate: "Os posts captam atenção e geram reação passiva — há audiência viva.",
  concentrated: "Há posts que provam capacidade de gerar conversa — a fórmula existe.",
  silent: "Os posts captam atenção e geram reação passiva — há audiência viva.",
  unavailable: "—",
};

const FAILS_MAP: Record<AudienceResponseStatus, string> = {
  active: "Garantir que a marca responde para manter o ciclo de conversa ativo.",
  moderate: "Poucos comentários em proporção aos gostos — comunicação ainda numa só direção.",
  concentrated: "A conversa está concentrada em poucos posts — sem consistência.",
  silent: "Zero comentários médios e zero respostas da marca — comunicação numa só direção.",
  unavailable: "Dados insuficientes para avaliar.",
};

const NEXT_MAP: Record<AudienceResponseStatus, string> = {
  active: "Manter consistência e responder a 100% dos comentários novos.",
  moderate: "Fechar legendas com pergunta direta e responder a 100% dos comentários novos.",
  concentrated: "Replicar a fórmula dos posts que geraram conversa e responder sempre.",
  silent: "Fechar legendas com pergunta direta e responder a 100% dos comentários novos.",
  unavailable: "Aguardar dados suficientes para uma leitura fiável.",
};

export function DiagnosticAudienceHighlight({
  avgLikes,
  avgComments,
  sampleSize,
  totalLikes,
  postsWithComments,
  topConversationPost,
  status = "silent",
  commentIntel,
}: AudienceHighlightProps) {
  const ownerReplies = commentIntel?.available ? commentIntel.ownerRepliesCount : 0;
  const sampleComments = commentIntel?.available ? commentIntel.sampleComments : null;

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
    return `${avgComments.toLocaleString("pt-PT")} por post`;
  })();

  return (
    <div className="space-y-4">
      {/* ── Z2: Three KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* KPI 1 — Gostos / post (neutral) */}
        <div className="rounded-[14px] border border-border-subtle bg-surface-muted/70 px-4 py-3.5 flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5">
            <Heart size={14} className="text-content-tertiary" strokeWidth={1.5} />
            <span className="text-eyebrow-sm text-content-tertiary">Gostos / post</span>
          </div>
          <span className="font-mono text-[28px] font-semibold tabular-nums text-content-primary leading-none">
            {avgLikes.toLocaleString("pt-PT")}
          </span>
          <span className="text-[11px] text-content-tertiary">
            {totalLikes != null
              ? `${totalLikes.toLocaleString("pt-PT")} gostos no total`
              : "por publicação"}
          </span>
        </div>

        {/* KPI 2 — Comentários / post (alert when < 1) */}
        <div
          className={cn(
            "rounded-[14px] border px-4 py-3.5 flex flex-col gap-1.5",
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
            <span className="text-eyebrow-sm text-content-tertiary">Coment. / post</span>
            {commentsIsAlert && (
              <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-signal-danger bg-signal-danger/10 rounded-full px-1.5 py-0.5">
                Alerta
              </span>
            )}
          </div>
          <span
            className={cn(
              "font-mono text-[28px] font-semibold tabular-nums leading-none",
              commentsIsAlert ? "text-signal-danger" : "text-content-primary",
            )}
          >
            {avgComments.toLocaleString("pt-PT")}
          </span>
          <span className="text-[11px] text-content-tertiary">
            {sampleSize ? `em ${sampleSize} publicações` : "por publicação"}
          </span>
        </div>

        {/* KPI 3 — Respostas da marca (alert when 0) */}
        <div
          className={cn(
            "rounded-[14px] border px-4 py-3.5 flex flex-col gap-1.5",
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
            <span className="text-eyebrow-sm text-content-tertiary">Respostas da marca</span>
            {repliesIsAlert && (
              <span className="ml-auto text-[9px] font-semibold uppercase tracking-wider text-signal-danger bg-signal-danger/10 rounded-full px-1.5 py-0.5">
                Alerta
              </span>
            )}
          </div>
          <span
            className={cn(
              "font-mono text-[28px] font-semibold tabular-nums leading-none",
              repliesIsAlert ? "text-signal-danger" : "text-content-primary",
            )}
          >
            {ownerReplies}
          </span>
          <span className="text-[11px] text-content-tertiary">
            {ownerReplies === 0 ? "a marca não conversa" : "respostas públicas detetadas"}
          </span>
        </div>
      </div>

      {/* ── Z3: Conversation flow diagram ── */}
      <div
        className="rounded-[14px] border border-border-default px-5 py-5 space-y-4"
        /* Decorative horizontal gradient: danger-tint → surface → primary-tint.
         * No semantic token exists for this multi-stop decorative gradient. */
        style={{
          background: "linear-gradient(90deg, var(--tint-danger) 0%, var(--surface-secondary) 45%, var(--tint-primary) 100%)",
        }}
      >
        <p className="text-eyebrow text-content-tertiary">Diagnóstico da conversa</p>

        {/* 3-node flow: Audience → Comments → Brand */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0">
          {/* Node 1 — Audience */}
          <div className="flex-1 rounded-xl border border-signal-success/20 bg-tint-success px-3.5 py-3 flex flex-col items-center gap-1.5 text-center">
            <div className="size-9 rounded-full bg-surface-secondary flex items-center justify-center">
              <Users size={16} className="text-signal-success" strokeWidth={1.5} />
            </div>
            <span className="text-[12px] font-semibold text-content-primary">Audiência</span>
            <span className="text-[11px] text-content-secondary leading-snug">vê e reage com gostos</span>
          </div>

          {/* Arrow 1 */}
          <div className="flex items-center justify-center sm:px-1.5 py-1 sm:py-0">
            <ArrowRight size={14} className="text-content-tertiary/50 hidden sm:block" />
            <svg className="sm:hidden text-content-tertiary/50" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
          </div>

          {/* Node 2 — Comments ("Elo perdido") */}
          <div className="flex-1 rounded-xl border-2 border-dashed border-signal-danger/40 bg-tint-danger px-3.5 py-3 flex flex-col items-center gap-1.5 text-center relative">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-widest text-signal-danger bg-surface-secondary border border-signal-danger/20 rounded-full px-2 py-0.5 whitespace-nowrap">
              Elo perdido
            </span>
            <div className="size-9 rounded-full bg-surface-secondary flex items-center justify-center mt-1">
              <MessageCircle size={16} className="text-signal-danger" strokeWidth={1.5} />
            </div>
            <span className="text-[12px] font-semibold text-content-primary">Comentários</span>
            <span className="text-[11px] text-content-secondary leading-snug">{commentSubcopy}</span>
          </div>

          {/* Arrow 2 */}
          <div className="flex items-center justify-center sm:px-1.5 py-1 sm:py-0">
            <ArrowRight size={14} className="text-content-tertiary/50 hidden sm:block" />
            <svg className="sm:hidden text-content-tertiary/50" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7" /></svg>
          </div>

          {/* Node 3 — Brand */}
          <div className="flex-1 rounded-xl border border-border-default bg-surface-muted px-3.5 py-3 flex flex-col items-center gap-1.5 text-center opacity-70">
            <div className="size-9 rounded-full bg-surface-secondary flex items-center justify-center">
              <MessageCircleReply size={16} className="text-content-tertiary" strokeWidth={1.5} />
            </div>
            <span className="text-[12px] font-semibold text-content-primary">Marca</span>
            <span className="text-[11px] text-content-secondary leading-snug">
              {ownerReplies === 0 ? "não responde publicamente" : "responde pontualmente"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Z4: Top conversation post highlight ── */}
      {topConversationPost && topConversationPost.comments > 0 && (
        <div className="rounded-[14px] border border-border-subtle bg-tint-primary/60 px-4 py-3.5 space-y-2">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-surface-secondary flex items-center justify-center shrink-0">
              <MessageSquare size={13} className="text-accent-primary" strokeWidth={1.5} />
            </div>
            <span className="text-eyebrow-sm text-content-tertiary">Post que gerou mais conversa</span>
          </div>
          {topConversationPost.captionExcerpt && (
            <p className="font-display text-[14px] font-medium text-content-primary leading-relaxed line-clamp-2">
              «{topConversationPost.captionExcerpt.slice(0, 120)}»
            </p>
          )}
          <div className="flex items-center gap-3 text-[12px]">
            <span className="flex items-center gap-1 text-content-secondary">
              <Heart size={11} strokeWidth={1.5} />
              <span className="tabular-nums">{topConversationPost.likes.toLocaleString("pt-PT")}</span>
            </span>
            <span className="flex items-center gap-1 text-accent-primary font-semibold">
              <MessageCircle size={11} strokeWidth={1.5} />
              <span className="tabular-nums">{topConversationPost.comments.toLocaleString("pt-PT")}</span>
            </span>
          </div>
        </div>
      )}

      {/* ── Z5: Works / Fails / Next ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <Z5Card
          icon={<CheckCircle2 size={14} className="text-signal-success" />}
          label="Funciona"
          text={WORKS_MAP[status]}
        />
        <Z5Card
          icon={<XCircle size={14} className="text-signal-danger" />}
          label="Falha"
          text={FAILS_MAP[status]}
        />
        <Z5Card
          icon={<Lightbulb size={14} className="text-signal-warning" />}
          label="Próximo"
          text={commentIntel?.available && commentIntel.recommendedConversationAction
            ? commentIntel.recommendedConversationAction
            : NEXT_MAP[status]}
        />
      </div>

      {/* ── Methodology footer ── */}
      {status !== "unavailable" && (
        <p className="text-[10.5px] text-content-tertiary italic leading-relaxed">
          Análise sobre {sampleSize ?? "—"} publicações
          {sampleComments != null ? ` · ${sampleComments} comentários públicos` : " · comentários públicos visíveis"}
          {" "}· sem DMs nem comentários ocultos
        </p>
      )}
    </div>
  );
}

function Z5Card({
  icon,
  label,
  text,
}: {
  icon: ReactNode;
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-[14px] border border-border-subtle bg-surface-muted/40 px-3.5 py-3 space-y-1.5">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-eyebrow-sm text-content-tertiary">{label}</span>
      </div>
      <p className="text-[12.5px] text-content-secondary leading-relaxed">{text}</p>
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
                    <span className="w-6 shrink-0 text-right font-mono text-[10px] tabular-nums text-content-tertiary">
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
