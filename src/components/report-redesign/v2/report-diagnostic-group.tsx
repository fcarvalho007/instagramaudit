import type { ReactNode } from "react";

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
    <div className="space-y-4 md:space-y-5 pt-8 md:pt-10 first:pt-0">
      <div className="flex items-center gap-3 border-b border-slate-200/60 pb-4">
        <span
          aria-hidden
          className="size-5 rounded-full bg-slate-100 inline-flex items-center justify-center text-[11px] font-bold text-slate-500 shrink-0"
        >
          {letter}
        </span>
        <p className="text-[12px] font-semibold tracking-[0.1em] uppercase text-slate-500">
          {label}
        </p>
        <span className="text-[10px] font-medium tracking-[0.08em] uppercase ml-auto text-slate-400 tabular-nums">
          {questionsCount} {questionsCount === 1 ? "PERGUNTA" : "PERGUNTAS"}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
        {children}
      </div>
    </div>
  );
}