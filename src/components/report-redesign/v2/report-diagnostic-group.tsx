import { Children, cloneElement, isValidElement, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface Props {
  letter: "A" | "B" | "C";
  label: string;
  questionsCount: number;
  children: ReactNode;
}

/**
 * Divisor full-width para um grupo de perguntas do Bloco 02.
 * Letra + label à esquerda, contador "N PERGUNTAS" à direita,
 * linha subtil por baixo. Não afeta o layout dos cartões filhos.
 */
export function ReportDiagnosticGroup({
  letter,
  label,
  questionsCount,
  children,
}: Props) {
  return (
    <div className="space-y-4 md:space-y-5">
      <div className="flex items-center gap-3 border-b border-slate-200/70 pb-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          <span className="text-slate-400">{letter}</span>
          <span className="mx-2 text-slate-300">·</span>
          <span>{label}</span>
        </p>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 tabular-nums">
          {questionsCount} {questionsCount === 1 ? "PERGUNTA" : "PERGUNTAS"}
        </span>
      </div>
      <div
        className={cn(
          "grid grid-cols-1 md:grid-cols-2",
          "gap-4 md:gap-5",
          "auto-rows-fr",
        )}
      >
        {renderGridChildren(children, questionsCount)}
      </div>
    </div>
  );
}

/**
 * Renderiza os filhos do grid resolvendo dois casos especiais:
 *   · 1 cartão → ocupa as 2 colunas em desktop;
 *   · número ímpar ≥ 3 → o último cartão ocupa as 2 colunas para
 *     evitar uma coluna órfã visualmente.
 */
function renderGridChildren(children: ReactNode, total: number): ReactNode {
  if (total === 1) {
    return Children.map(children, (child) =>
      isValidElement(child) ? (
        <div className="md:col-span-2">{child}</div>
      ) : (
        child
      ),
    );
  }
  if (total >= 3 && total % 2 === 1) {
    const arr = Children.toArray(children);
    const lastIdx = arr.length - 1;
    return arr.map((child, idx) =>
      idx === lastIdx && isValidElement(child) ? (
        <div key={`q-orphan-${idx}`} className="md:col-span-2">
          {child}
        </div>
      ) : (
        child
      ),
    );
  }
  return children;
}

// `cloneElement` import kept for future variants requiring className merge.
void cloneElement;