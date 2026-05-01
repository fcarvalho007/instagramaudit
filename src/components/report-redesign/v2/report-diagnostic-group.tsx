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
    <div className="space-y-4 md:space-y-5 pt-6 md:pt-8 first:pt-0">
      <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
        <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-slate-500">
          <span className="text-slate-500 font-bold">{letter}</span>
          <span className="mx-2 text-slate-300">·</span>
          <span>{label}</span>
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