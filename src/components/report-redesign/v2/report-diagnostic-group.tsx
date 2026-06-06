import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

interface Props {
  letter: "A" | "B" | "C" | "D" | "E";
  label: string;
  questionsCount: number;
  /**
   * "split" (default) → grelha 2-col em desktop, ideal para 2 cartões `half`.
   * "stack" → coluna única full-width, ideal para grupos com 1 cartão
   * ou cartões editoriais largos (hashtags, legendas, capas, audiência, integração).
   */
  layout?: "split" | "stack";
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
  layout = "split",
  children,
}: Props) {
  const { t } = useTranslation("report");
  return (
     <div className="space-y-4 md:space-y-5">
      <div className="flex items-center gap-3 border-b border-border-subtle pb-4">
        <span
          aria-hidden
          className="size-5 rounded-full bg-surface-muted inline-flex items-center justify-center text-xs font-bold text-content-tertiary shrink-0"
        >
          {letter}
        </span>
        <p className="text-eyebrow text-content-tertiary">
          {label}
        </p>
        <span className="text-[11px] font-medium tracking-[0.08em] uppercase ml-auto text-content-tertiary tabular-nums">
          {t("diagnostic.group_questions", { count: questionsCount })}
        </span>
      </div>
      {layout === "stack" ? (
        <div className="flex flex-col gap-5 md:gap-6">{children}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          {children}
        </div>
      )}
    </div>
  );
}
