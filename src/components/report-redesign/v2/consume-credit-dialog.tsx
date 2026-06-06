import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeInstagramHandle } from "@/lib/instagram/normalize-handle";

export type ConsumeCreditIntent =
  | { kind: "period"; days: number }
  | { kind: "competitor"; handle?: string };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  intent: ConsumeCreditIntent | null;
  balance: number;
  /**
   * Disparada quando o utilizador clica em "Usar 1 crédito" com saldo
   * suficiente. Para `competitor`, o `handle` é preenchido a partir do
   * input deste dialog antes de chamar o caller. O caller é responsável
   * por reservar/consumir o crédito e disparar a análise.
   */
  onConfirm: (intent: ConsumeCreditIntent) => void;
  /** Dispara quando o utilizador clica em "Enviar feedback" no estado vazio. */
  onEmptyFeedback?: () => void;
  /** Quando true, mostra spinner e desativa CTAs (submissão em curso). */
  submitting?: boolean;
  /** Mensagem de erro inline (após falha). */
  errorMessage?: string | null;
  /** Handle do perfil primário (para validar duplicados). */
  primaryHandle?: string;
  /** Handles dos concorrentes já presentes (para validar duplicados). */
  existingCompetitors?: string[];
  /** Máximo de concorrentes permitido (defensivo; default 2). */
  competitorMax?: number;
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
  submitting = false,
  errorMessage = null,
  primaryHandle,
  existingCompetitors = [],
  competitorMax = 2,
}: Props) {
  const { t } = useTranslation("report");

  const [competitorInput, setCompetitorInput] = useState("");
  useEffect(() => {
    // Reset input whenever the dialog opens or the intent changes.
    if (open) setCompetitorInput("");
  }, [open, intent?.kind]);

  if (!intent) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md" />
      </Dialog>
    );
  }

  const hasCredit = balance >= 1;
  const isPeriod = intent.kind === "period";
  const isCompetitor = intent.kind === "competitor";
  const atCompetitorLimit =
    isCompetitor && existingCompetitors.length >= competitorMax;
  const description =
    isPeriod
      ? t("nav.explore.consume_dialog.period_coming_soon_body")
      : t("nav.explore.consume_dialog.description_competitor");
  const title =
    isPeriod
      ? t("nav.explore.consume_dialog.period_coming_soon_title")
      : t("nav.explore.consume_dialog.title_competitor");
  const confirmCta =
    t("nav.explore.consume_dialog.cta_use_competitor");

  // Competitor handle validation (only used when isCompetitor + hasCredit).
  const normalized = normalizeInstagramHandle(competitorInput);
  const handleValid = /^[a-z0-9._]{1,30}$/.test(normalized);
  const existingLower = [
    ...(primaryHandle ? [primaryHandle.toLowerCase()] : []),
    ...existingCompetitors.map((h) => h.toLowerCase()),
  ];
  const isDuplicate = handleValid && existingLower.includes(normalized);
  const competitorReady = handleValid && !isDuplicate;
  const handleInvalidMsg = competitorInput.length === 0
    ? null
    : !handleValid
      ? t("nav.explore.consume_dialog.competitor_handle_invalid")
      : isDuplicate
        ? t("nav.explore.consume_dialog.competitor_handle_duplicate")
        : null;

  const handleConfirmClick = () => {
    if (submitting) return;
    if (isCompetitor) {
      if (atCompetitorLimit) return;
      if (!competitorReady) return;
      onConfirm({ kind: "competitor", handle: normalized });
      return;
    }
    onConfirm(intent);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Block close while submitting to avoid double-clicks / lost state.
        if (submitting && !next) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {atCompetitorLimit
              ? t("nav.explore.competitor_limit_reached")
              : hasCredit
              ? title
              : t("nav.explore.consume_dialog.empty_title")}
          </DialogTitle>
          <DialogDescription>
            {atCompetitorLimit
              ? t("nav.explore.competitor_limit_dialog_body")
              : hasCredit
              ? description
              : t("nav.explore.consume_dialog.empty_body")}
          </DialogDescription>
        </DialogHeader>

        {atCompetitorLimit ? (
          <p className="text-xs text-content-secondary">
            {t("nav.explore.competitor_limit_hint")}
          </p>
        ) : null}

        {hasCredit && isCompetitor && !atCompetitorLimit ? (
          <>
            <div className="space-y-1.5">
              <label
                htmlFor="competitor-handle-input"
                className="text-xs font-semibold text-content-secondary"
              >
                {t("nav.explore.consume_dialog.competitor_handle_label")}
              </label>
              <Input
                id="competitor-handle-input"
                value={competitorInput}
                onChange={(e) => setCompetitorInput(e.target.value)}
                placeholder={t("nav.explore.consume_dialog.competitor_handle_placeholder")}
                disabled={submitting}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={31}
                aria-invalid={handleInvalidMsg ? "true" : undefined}
                aria-describedby={handleInvalidMsg ? "competitor-handle-error" : undefined}
              />
              {handleInvalidMsg ? (
                <p
                  id="competitor-handle-error"
                  className="text-[11px] text-signal-danger"
                >
                  {handleInvalidMsg}
                </p>
              ) : null}
            </div>
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

        {hasCredit && isPeriod ? (
          <div className="rounded-md border border-border-default bg-surface-muted px-3 py-2 text-xs text-content-secondary">
            <p>
              {t("nav.explore.consume_dialog.balance_label")}:{" "}
              <span className="font-semibold text-content-primary tabular-nums">
                {balance}
              </span>
            </p>
          </div>
        ) : null}

        {errorMessage ? (
          <p className="text-xs text-signal-danger" role="alert">
            {errorMessage}
          </p>
        ) : null}

        {hasCredit && isCompetitor ? (
          <p className="text-[11px] text-content-tertiary">
            {t("nav.explore.consume_dialog.soon_note")}
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t("nav.explore.consume_dialog.cta_cancel")}
          </Button>
          {atCompetitorLimit ? null : hasCredit ? (
            isPeriod ? null : (
              <Button
                onClick={handleConfirmClick}
                disabled={submitting || !competitorReady}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    {t("nav.explore.consume_dialog.submitting")}
                  </>
                ) : (
                  confirmCta
                )}
              </Button>
            )
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