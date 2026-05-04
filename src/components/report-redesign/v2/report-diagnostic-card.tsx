import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { MessagesSquare, MessageCircleMore, Target, MessageCircleOff, CircleHelp } from "lucide-react";
import type { AudienceResponseStatus } from "@/lib/report/block02-diagnostic";
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
        "p-6 md:p-7",
        "shadow-card",
        ACCENT_BORDER[tone],
      )}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-eyebrow-sm text-content-tertiary min-w-0">
          Pergunta {number}
          <span className="mx-1.5 text-content-tertiary/40">·</span>
          <span className="text-content-tertiary">{label}</span>
        </p>
        {sourceType ? (
          <ReportSourceLabel
            type={sourceType}
            detail={sourceDetail}
          />
        ) : null}
      </div>

      {/* Full-width: horizontal layout with question+answer left, evidence right */}
      {isFull ? (
        <div className="flex flex-col md:flex-row md:gap-8">
          <div className="flex-1 min-w-0 flex flex-col gap-4">
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
          {children ? (
            <div className="mt-4 md:mt-0 md:w-[40%] shrink-0 min-w-0">
              {children}
            </div>
          ) : null}
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

          <p className="text-sm text-content-secondary leading-relaxed mt-auto">{body}</p>

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
                <span className={cn("w-20 sm:w-28 shrink-0 truncate text-content-secondary", isDominant && "font-medium text-content-primary")}>
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
    topo: { active: "bg-accent-primary text-white", idle: "bg-tint-primary text-accent-primary" },
    meio: { active: "bg-accent-primary/80 text-white", idle: "bg-tint-primary text-accent-primary" },
    fundo: { active: "bg-accent-primary/60 text-white", idle: "bg-surface-muted text-content-secondary" },
    pos: { active: "bg-accent-primary/40 text-content-primary", idle: "bg-surface-muted text-content-tertiary" },
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
            className="flex items-center gap-2.5 rounded-lg border border-border-subtle bg-surface-secondary px-3 py-2"
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

// Public Apify profile/post payload does not reliably indicate whether the
// brand replied inside comment threads unless comment-level data with
// authors is collected.

/**
 * Destaque editorial para a Q06 — strip colorido com a métrica
 * principal (likes médios) e linha discreta com comentários médios.
 */
export function DiagnosticAudienceHighlight({
  avgLikes,
  avgComments,
  totalLikes,
  totalComments,
  postsWithComments,
  sampleSize,
  tone = "rose",
  topConversationPost,
  status = "silent",
}: {
  avgLikes: number;
  avgComments: number;
  totalLikes?: number | null;
  totalComments?: number | null;
  postsWithComments?: number;
  sampleSize?: number;
  tone?: "rose" | "emerald" | "amber";
  topConversationPost?: {
    index: number;
    comments: number;
    likes: number;
    captionExcerpt: string;
  } | null;
  status?: AudienceResponseStatus;
}) {
  /* Status icon map — local, uses semantic tint + signal tokens where possible.
   * "silent" uses tint-warning (soft amber) instead of aggressive rose. */
  const STATUS_ICON: Record<AudienceResponseStatus, { Icon: typeof MessagesSquare; bg: string; fg: string }> = {
    active: { Icon: MessagesSquare, bg: "bg-tint-success", fg: "text-signal-success" },
    moderate: { Icon: MessageCircleMore, bg: "bg-tint-warning", fg: "text-signal-warning" },
    concentrated: { Icon: Target, bg: "bg-tint-warning", fg: "text-signal-warning" },
    silent: { Icon: MessageCircleOff, bg: "bg-tint-danger", fg: "text-signal-danger" },
    unavailable: { Icon: CircleHelp, bg: "bg-surface-muted", fg: "text-content-tertiary" },
  };

  const EDITORIAL: Record<AudienceResponseStatus, string> = {
    silent: "O público reage com gostos, mas quase não conversa publicamente.",
    active: "Há sinais de conversa pública consistente — o conteúdo não está apenas a ser consumido.",
    moderate: "Há alguma resposta, mas ainda sem volume suficiente para indicar conversa recorrente.",
    concentrated: "A conversa existe, mas está concentrada em poucos posts.",
    unavailable: "As publicações analisadas não devolveram dados suficientes de gostos/comentários para uma leitura fiável.",
  };

  const { Icon: StatusIcon, bg: iconBg, fg: iconFg } = STATUS_ICON[status];

  return (
    <div className="space-y-2.5">
      {/* Status icon — decorative, reduced size */}
      <div className="flex justify-center sm:justify-start">
        <div className={cn("size-16 sm:size-20 rounded-2xl flex items-center justify-center", iconBg)} aria-hidden="true">
          <StatusIcon size={40} className={cn(iconFg, "opacity-80")} strokeWidth={1.25} />
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <MiniStat label="Gostos médios por post" value={avgLikes.toLocaleString("pt-PT")} />
        <MiniStat label="Comentários médios por post" value={avgComments.toLocaleString("pt-PT")} />
        {sampleSize != null && sampleSize > 0 && (
          <MiniStat
            label="Posts com comentários"
            value={`${postsWithComments ?? 0} de ${sampleSize}`}
          />
        )}
        {totalLikes != null && (
          <MiniStat label="Gostos totais" value={totalLikes.toLocaleString("pt-PT")} />
        )}
      </div>

      {/* Editorial interpretation */}
      <InsightCallout
        tone={status === "silent" ? "warning" : status === "active" ? "editorial" : "suggestion"}
        label={status === "silent" ? "Atenção" : status === "active" ? "Leitura editorial" : "O que isto sugere"}
      >
        {EDITORIAL[status]}
      </InsightCallout>

      {/* Conversation prompt strip */}
      {(status === "silent" || status === "moderate") && (
        <InsightCallout tone="suggestion" label="Próximo passo">
          Experiência sugerida: testar perguntas fechadas, escolhas A/B ou CTAs de comentário.
        </InsightCallout>
      )}

      {/* Top conversation post evidence */}
      {topConversationPost && topConversationPost.comments > 0 && (
        <div className="rounded-md bg-surface-muted ring-1 ring-border-default px-3 py-2 flex flex-col gap-0.5">
          <span className="text-eyebrow-sm text-content-tertiary">Post com mais conversa</span>
          <div className="flex items-center gap-3 text-[13px] text-content-secondary">
            <span className="font-mono tabular-nums text-content-primary font-semibold">
              {topConversationPost.comments} comentários
            </span>
            <span className="text-content-tertiary">·</span>
            <span className="font-mono tabular-nums">
              {topConversationPost.likes} gostos
            </span>
          </div>
          {topConversationPost.captionExcerpt && (
            <p className="text-[12px] text-content-tertiary italic line-clamp-1 mt-0.5">
              «{topConversationPost.captionExcerpt.slice(0, 80)}»
            </p>
          )}
        </div>
      )}

      {/* Brand reply disclaimer */}
      {status !== "unavailable" && (
        <p className="text-[11px] text-content-tertiary italic leading-relaxed">
          Esta leitura mede volume público de gostos e comentários; não avalia respostas da marca aos comentários.
        </p>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-muted ring-1 ring-border-default px-2.5 py-2 flex flex-col gap-0.5">
      <span className="text-eyebrow-sm text-content-tertiary">{label}</span>
      <span className="font-mono text-[14px] tabular-nums text-content-primary font-semibold">
        {value}
      </span>
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
          <ul className="space-y-1.5">
            {ranking.map((item) => {
              const pct = Math.round((item.score / maxScore) * 100);
              const isPrimary = item.label === primary;
              return (
                <li key={item.label} className="text-sm">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "w-[7.5rem] sm:w-40 shrink-0 truncate",
                      isPrimary ? "font-medium text-content-primary" : "text-content-secondary",
                    )}>
                      {item.label}
                    </span>
                    <div className={cn(
                      "flex-1 overflow-hidden rounded-full",
                      isPrimary ? "h-2.5 bg-tint-primary" : "h-2 bg-surface-muted",
                    )}>
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isPrimary ? "bg-accent-primary" : "bg-content-tertiary/30",
                        )}
                        style={{ width: `${pct}%` }}
                        aria-hidden
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right font-mono text-[11px] tabular-nums text-content-tertiary">
                      {item.score}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {/* Secondary objective */}
      {secondary ? (
        <div className="rounded-lg bg-surface-muted/60 ring-1 ring-border-default px-4 py-3 space-y-1">
          <p className="text-eyebrow-sm text-content-tertiary">Objetivo secundário</p>
          <p className="text-[15px] font-medium text-content-primary">
            {secondary}
          </p>
        </div>
      ) : null}

      {/* Support signals */}
      {supportSignals.length > 0 ? (
        <div className="space-y-2">
          <p className="text-eyebrow-sm text-content-tertiary">Sinais de suporte</p>
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

      {/* Disclaimer */}
      <InsightCallout tone="suggestion" label="Nota metodológica">
        Esta hipótese é derivada dos sinais públicos analisados e não substitui
        o objetivo real definido pela marca ou criador.
      </InsightCallout>
    </div>
  );
}
