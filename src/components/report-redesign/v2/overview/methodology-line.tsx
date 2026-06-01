import { useTranslation } from "react-i18next";

export interface MethodologyLineProps {
  /** Nº de publicações na amostra de performance (eligiblePosts). */
  count: number;
  /** Janela observada em dias (derivada de `cadence.windowDays`). */
  observedDays: number;
  /** `cadence.sufficient` — false renderiza a copy reduzida. */
  sufficient: boolean;
  /** Publicações fixadas excluídas do cálculo de desempenho. */
  pinnedExcluded: number;
  /** Publicações anómalas por data excluídas do cálculo de desempenho. */
  outliersExcluded: number;
}

/**
 * Linha discreta de transparência sob o cartão de identidade editorial
 * (Bloco 1). Mostra base de cálculo da análise sem ocupar espaço de hero.
 *
 * - Texto pequeno, token muted, sem card, sem novo ícone.
 * - A nota de exclusões é renderizada como `title=` (tooltip nativo) para
 *   evitar dependências adicionais.
 */
export function MethodologyLine({
  count,
  observedDays,
  sufficient,
  pinnedExcluded,
  outliersExcluded,
}: MethodologyLineProps) {
  const { t } = useTranslation("report");
  const totalExcluded = Math.max(0, pinnedExcluded) + Math.max(0, outliersExcluded);
  const safeDays = Math.max(0, observedDays);

  let mainText: string;
  if (!sufficient || count <= 0) {
    mainText = t("posts.methodology.insufficient");
  } else if (count === 1) {
    mainText = t("posts.methodology.line_one", { days: safeDays });
  } else {
    mainText = t("posts.methodology.line_other", { count, days: safeDays });
  }

  return (
    <p className="text-xs text-content-tertiary leading-relaxed">
      <span>{mainText}</span>
      {totalExcluded > 0 && (
        <>
          {" · "}
          <span
            className="underline decoration-dotted underline-offset-2 cursor-help"
            title={t("posts.methodology.exclusions_note")}
          >
            {t("posts.methodology.exclusions_note")}
          </span>
        </>
      )}
    </p>
  );
}