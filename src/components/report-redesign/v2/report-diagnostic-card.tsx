import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

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
 *   eyebrow (PERGUNTA NN · LABEL)
 *   pergunta entre aspas (serif)
 *   bloco "Resposta dominante" colorido
 *   slot livre (children) com evidência
 *   body interpretativo curto
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
}: Props) {
  const t = TONE[tone];
  return (
    <article
      className={cn(
        "h-full flex flex-col gap-4",
        "rounded-2xl border border-slate-200/70 bg-white",
        "p-5 md:p-6",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-16px_rgba(15,23,42,0.08)]",
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
        Pergunta {number}
        <span className="mx-1.5 text-slate-300">·</span>
        <span className="text-slate-500">{label}</span>
      </p>

      <h3
        className={cn(
          "font-display text-[1.05rem] md:text-[1.125rem] font-semibold leading-snug tracking-tight text-slate-900",
          "min-w-0",
        )}
      >
        “{question}”
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
    </article>
  );
}

/**
 * Barra horizontal simples para mostrar uma distribuição de % por
 * categoria. Usada nos cartões 03 (formato) e 01/02 quando aplicável.
 */
export function DiagnosticDistributionBar({
  items,
}: {
  items: Array<{ label: string; value: number; color?: string }>;
}) {
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
              {Math.round(it.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
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
          <p className="font-display text-base font-semibold text-slate-900 tabular-nums leading-none">
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
 */
export function DiagnosticRanking({
  items,
}: {
  items: Array<{ label: string; score: number }>;
}) {
  const max = Math.max(1, ...items.map((i) => i.score));
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