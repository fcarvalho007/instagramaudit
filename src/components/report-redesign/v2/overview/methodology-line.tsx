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
  // `outliersExcluded` é mantido na API para uso futuro (premium); não é
  // exposto na free para evitar sobrecarregar o utilizador.
  void outliersExcluded;
  const pinnedCount = Math.max(0, pinnedExcluded);
  const safeDays = Math.max(0, observedDays);

  let mainText: string;
  if (!sufficient || count <= 0) {
    mainText = t("posts.methodology.insufficient");
  } else if (count === 1) {
    mainText = t("posts.methodology.line_one", { days: safeDays });
  } else {
    mainText = t("posts.methodology.line_other", { count, days: safeDays });
  }

  const pinnedText =
    pinnedCount === 1
      ? t("posts.methodology.pinned_one")
      : t("posts.methodology.pinned_other", { count: pinnedCount });

  return (
    <p className="text-xs text-content-tertiary leading-relaxed">
      <span>{mainText}</span>
      {pinnedCount > 0 && (
        <>
          {" · "}
          <span
            className="underline decoration-dotted underline-offset-2 cursor-help"
            title={t("posts.methodology.exclusions_tooltip")}
          >
            {pinnedText}
          </span>
        </>
      )}
    </p>
  );
}