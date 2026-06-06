import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ConsumeCreditIntent =
  | { kind: "period"; days: number }
  | { kind: "competitor" };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent: ConsumeCreditIntent | null;
  balance: number;
  /**
   * Disparada quando o utilizador clica em "Usar 1 crédito" com saldo
   * suficiente. O consumo real (reserveCredit + nova análise) é da
   * responsabilidade do caller — este dialog apenas confirma intenção.
   */
  onConfirm: (intent: ConsumeCreditIntent) => void;
  /** Dispara quando o utilizador clica em "Enviar feedback" no estado vazio. */
  onEmptyFeedback?: () => void;
}

/**
 * Modal de confirmação para consumir 1 crédito beta — usado pelo sidebar
 * paid state quando o utilizador clica num chip de período (30d/90d) ou
 * em "Adicionar concorrente". NUNCA mencionar os créditos antes da
 * compra: este componente só é montado em ramos `premiumUnlocked`.
 */
export function ConsumeCreditDialog({
  open,
  onOpenChange,
  intent,
  balance,
  onConfirm,
  onEmptyFeedback,
}: Props) {
  const { t } = useTranslation("report");

  if (!intent) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" />
      </Dialog>
    );
  }

  const hasCredit = balance >= 1;
  const description =
    intent.kind === "period"
      ? t("nav.explore.consume_dialog.description_period", { days: intent.days })
      : t("nav.explore.consume_dialog.description_competitor");
  const title =
    intent.kind === "period"
      ? t("nav.explore.consume_dialog.title_period")
      : t("nav.explore.consume_dialog.title_competitor");
  const confirmCta =
    intent.kind === "period"
      ? t("nav.explore.consume_dialog.cta_use_period")
      : t("nav.explore.consume_dialog.cta_use_competitor");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {hasCredit
              ? title
              : t("nav.explore.consume_dialog.empty_title")}
          </DialogTitle>
          <DialogDescription>
            {hasCredit
              ? description
              : t("nav.explore.consume_dialog.empty_body")}
          </DialogDescription>
        </DialogHeader>

        {hasCredit ? (
          <>
            <p className="text-xs text-content-secondary">
              {t("nav.explore.consume_dialog.credit_line")}
            </p>
            <p className="text-xs text-content-tertiary">
              {t("nav.explore.consume_dialog.balance_hint", { count: balance })}
            </p>
          <div className="rounded-md border border-border-default bg-surface-muted px-3 py-2 text-xs text-content-secondary tabular-nums">
            <div className="flex items-center justify-between">
              <span>{t("nav.explore.consume_dialog.balance_label")}</span>
              <span className="font-semibold text-content-primary">{balance}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span>{t("nav.explore.consume_dialog.balance_after")}</span>
              <span className="font-semibold text-content-primary">
                {balance - 1}
              </span>
            </div>
          </div>
          </>
        ) : null}

        {hasCredit ? (
          <p className="text-[11px] text-content-tertiary">
            {t("nav.explore.consume_dialog.soon_note")}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            {t("nav.explore.consume_dialog.cta_cancel")}
          </Button>
          {hasCredit ? (
            <Button onClick={() => onConfirm(intent)}>
              {confirmCta}
            </Button>
          ) : (
            <Button
              onClick={() => {
                onOpenChange(false);
                onEmptyFeedback?.();
              }}
            >
              {t("nav.explore.consume_dialog.empty_cta")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}