import { useTranslation } from "react-i18next";
import { Trans } from "react-i18next";
import { useEffect, useState } from "react";
import { Loader2, UserPlus, Info, Coins, ArrowRight } from "lucide-react";
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
          {hasCredit && isCompetitor && !atCompetitorLimit ? (
            <div
              aria-hidden="true"
              className="mb-1 flex size-10 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary"
            >
              <UserPlus className="size-5" />
            </div>
          ) : null}
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
            <div className="flex gap-2 rounded-md border border-accent-primary/20 bg-accent-primary/8 px-3 py-2.5 text-xs text-content-secondary">
              <Info className="mt-0.5 size-4 shrink-0 text-accent-primary" aria-hidden="true" />
              <p className="leading-relaxed">
                <Trans
                  i18nKey="nav.explore.consume_dialog.competitor_beta_note"
                  t={t}
                  components={{ strong: <strong className="font-semibold text-content-primary" /> }}
                />
              </p>
            </div>
            <div className="h-px bg-border-default" />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Coins className="size-5 text-signal-success" aria-hidden="true" />
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-content-primary">
                    {t("nav.explore.consume_dialog.credit_use_label")}
                  </span>
                  <span className="text-xs text-content-tertiary">
                    {t("nav.explore.consume_dialog.credit_available_hint", { count: balance })}
                  </span>
                </div>
              </div>
              <span className="rounded-full bg-signal-success/12 px-2.5 py-1 text-eyebrow-sm text-signal-success">
                {t("nav.explore.consume_dialog.free_in_beta_badge")}
              </span>
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

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
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
                className="gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    {t("nav.explore.consume_dialog.submitting")}
                  </>
                ) : (
                  <>
                    {confirmCta}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
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