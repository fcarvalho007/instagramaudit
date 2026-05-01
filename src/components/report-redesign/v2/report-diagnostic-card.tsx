import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";
import { ReportSourceLabel, type ReportSourceType } from "./report-source-label";

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
  /** Marca o chip como `caution` (amber) — usar só em leituras automáticas que sinalizam algo a corrigir. */
  sourceCaution?: boolean;
}

const TONE: Record<
  DiagnosticTone,
  { box: string; answerText: string; chip: string }
> = {
  blue: {
    box: "bg-blue-50/70 ring-blue-100",
    answerText: "text-blue-800",
    chip: "text-blue-700",
  },
  emerald: {
    box: "bg-emerald-50/70 ring-emerald-100",
    answerText: "text-emerald-800",
    chip: "text-emerald-700",
  },
  amber: {
    box: "bg-amber-50/70 ring-amber-100",
    answerText: "text-amber-900",
    chip: "text-amber-800",
  },
  rose: {
    box: "bg-rose-50/70 ring-rose-100",
    answerText: "text-rose-800",
    chip: "text-rose-700",
  },
  slate: {
    box: "bg-slate-50 ring-slate-200",
    answerText: "text-slate-800",
    chip: "text-slate-700",
  },
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
  answerLabel = "Resposta dominante",
  answer,
  children,
  body,
  tone = "blue",
  aiSource,
  sourceType,
  sourceDetail,
  sourceCaution,
}: Props) {
  const t = TONE[tone];
  return (
    <article
      className={cn(
        "h-full flex flex-col gap-5",
        "rounded-2xl border border-slate-200/70 bg-white",
        "p-6 md:p-7",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.08)]",
      )}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 min-w-0">
          Pergunta {number}
          <span className="mx-1.5 text-slate-300">·</span>
          <span className="text-slate-500">{label}</span>
        </p>
        {sourceType ? (
          <ReportSourceLabel
            type={sourceType}
            detail={sourceDetail}
            caution={sourceCaution}
          />
        ) : null}
      </div>

      <h3
        className={cn(
          "font-display text-[1.05rem] md:text-[1.125rem] font-semibold leading-snug tracking-tight text-slate-900",
          "min-w-0",
        )}
      >
        {question}
      </h3>

      <div
        className={cn(
          "rounded-xl ring-1 px-4 py-3",
          t.box,
        )}
      >
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
          {answerLabel}
        </p>
        <p
          className={cn(
              "mt-1 font-display text-[1.125rem] md:text-[1.25rem] font-semibold tracking-tight leading-tight",
            t.answerText,
          )}
        >
          {answer}
        </p>
      </div>

      {children ? <div className="min-w-0">{children}</div> : null}

      <p className="text-sm text-slate-600 leading-relaxed mt-auto">{body}</p>

      {aiSource ? (
        <div className="border-t border-slate-200/70 pt-3 space-y-1.5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-blue-700 inline-flex items-center gap-1.5">
            <Bot aria-hidden className="size-3" />
            Leitura IA · interpretação
          </p>
          <p className="text-sm text-slate-700 leading-relaxed italic">
            {aiSource.text}
          </p>
        </div>
      ) : null}

      {sourceType ? (
        <div className="pt-3 border-t border-slate-100">
          <ReportSourceLabel
            type={sourceType}
            detail={sourceDetail}
            caution={sourceCaution}
          />
        </div>
      ) : null}
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
          return (
            <li key={`${it.label}-${i}`} className="text-sm">
              <div className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-slate-700">
                  {it.label}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn("h-full", it.color ?? "bg-emerald-600")}
                    style={{ width: `${pct}%` }}
                    aria-hidden
                  />
                </div>
                <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-slate-600">
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
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        {items.map((it, i) => (
          <div
            key={`${it.label}-${i}`}
            className={cn("h-full", it.color ?? "bg-blue-500")}
            style={{ width: `${(Math.max(0, it.value) / total) * 100}%` }}
            aria-hidden
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {items.map((it, i) => (
          <li
            key={`${it.label}-${i}-legend`}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600"
          >
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                it.color ?? "bg-blue-500",
              )}
            />
            <span className="font-medium text-slate-700">{it.label}</span>
            <span className="tabular-nums text-slate-500">
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
  const STAGE_TONE: Record<
    "topo" | "meio" | "fundo" | "pos",
    { active: string; idle: string; text: string }
  > = {
    topo: { active: "bg-blue-700 text-white", idle: "bg-blue-100 text-blue-900", text: "text-blue-900" },
    meio: { active: "bg-blue-500 text-white", idle: "bg-blue-100 text-blue-900", text: "text-blue-900" },
    fundo: { active: "bg-blue-400 text-white", idle: "bg-slate-100 text-slate-700", text: "text-slate-700" },
    pos: { active: "bg-blue-300 text-blue-950", idle: "bg-slate-100 text-slate-500", text: "text-slate-500" },
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
                "font-mono text-[10px] uppercase tracking-[0.14em]",
                active ? tone.active : tone.idle,
              )}
              style={{ width: `${width}%`, minWidth: "fit-content" }}
            >
              {it.label}
            </div>
            <span className="absolute right-0 top-1/2 -translate-y-1/2 font-mono text-[11px] tabular-nums text-slate-600">
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
          className="rounded-lg border border-slate-200/70 bg-slate-50/60 px-3 py-2.5 text-center"
        >
          <p className="font-mono text-[15px] font-semibold text-slate-900 tabular-nums leading-none">
            {it.value}
          </p>
          <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
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
            ? "bg-emerald-500"
            : it.status === "partial"
              ? "bg-amber-500"
              : "bg-slate-300";
        const tag =
          it.status === "detected"
            ? "Detetado"
            : it.status === "partial"
              ? "Parcial"
              : "Ausente";
        return (
          <li
            key={`${it.label}-${i}`}
            className="flex items-center gap-2.5 rounded-lg border border-slate-200/60 bg-white px-3 py-2"
          >
            <span aria-hidden className={cn("size-2 rounded-full shrink-0", dot)} />
            <span className="text-sm text-slate-700 min-w-0 truncate">
              {it.label}
              {it.hint ? (
                <span className="ml-1.5 text-slate-400">{it.hint}</span>
              ) : null}
            </span>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
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
                <span className="w-10 shrink-0 text-right font-mono text-[11px] tabular-nums text-slate-600">
                  {pct}%
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${pct}%` }}
                    aria-hidden
                  />
                </div>
                <span className="w-44 shrink-0 truncate text-slate-700">
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
            <span className="text-slate-700 truncate">{it.label}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 tabular-nums shrink-0">
              {Math.round((it.score / max) * 100)}%
            </span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${(it.score / max) * 100}%` }}
              aria-hidden
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Destaque editorial para a Q06 — strip colorido com a métrica
 * principal (likes médios) e linha discreta com comentários médios.
 */
export function DiagnosticAudienceHighlight({
  avgLikes,
  avgComments,
  tone = "rose",
}: {
  avgLikes: number;
  avgComments: number;
  tone?: "rose" | "emerald" | "amber";
}) {
  // Empty-state explícito quando não há sinais de engagement
  // (evita renderizar barra vermelha 100% com "0 GOSTOS MÉDIOS").
  if (avgLikes <= 0 && avgComments <= 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
          Sem dados de gostos/comentários
        </p>
        <p className="mt-1 text-[12.5px] text-slate-600 leading-relaxed">
          As publicações analisadas não devolveram contagens públicas de
          engagement — comum em perfis com posts mais antigos ou conteúdo
          restrito.
        </p>
      </div>
    );
  }
  const TONE_BG: Record<typeof tone, string> = {
    rose: "bg-rose-600 text-white",
    emerald: "bg-emerald-600 text-white",
    amber: "bg-amber-500 text-white",
  };
  const DOT: Record<typeof tone, string> = {
    rose: "bg-rose-300",
    emerald: "bg-emerald-300",
    amber: "bg-amber-300",
  };
  return (
    <div className="space-y-2">
      <div
        className={cn(
          "rounded-md px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em]",
          TONE_BG[tone],
        )}
      >
        <span className="font-mono text-[15px] font-semibold normal-case tracking-normal tabular-nums">
          {avgLikes.toLocaleString("pt-PT")}
        </span>{" "}
        <span className="opacity-90">gostos médios</span>
      </div>
      <div className="flex items-center gap-2 px-1">
        <span aria-hidden className={cn("size-1.5 rounded-full", DOT[tone])} />
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">
          <span className="font-mono text-[13px] font-semibold normal-case tracking-normal text-slate-700 tabular-nums">
            {avgComments.toLocaleString("pt-PT")}
          </span>{" "}
          comentários médios
        </span>
      </div>
    </div>
  );
}