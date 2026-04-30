import type { ReactNode } from "react";

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
        {children}
      </div>
    </div>
  );
}