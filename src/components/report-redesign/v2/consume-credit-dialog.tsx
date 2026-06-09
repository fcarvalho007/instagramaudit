import { useTranslation } from "react-i18next";
import { Trans } from "react-i18next";
import { useEffect, useState } from "react";
import { Loader2, UserPlus, Info, Coins, ArrowRight, CalendarClock } from "lucide-react";
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

/**
 * Cache-state probe result for the period flow. When provided AND
 * `hasFreshCache` is true, the dialog renders two CTAs:
 *   • "Open recent analysis" → no credit, no provider call
 *   • "Generate new analysis · 1 credit" → force_refresh path
 * When omitted or `hasFreshCache=false`, the dialog falls back to the
 * single "generate new analysis · 1 credit" CTA.
 */
export interface PeriodCacheStateUi {
  hasFreshCache: boolean;
  ageMs: number | null;
}

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
   * Para `period`, o segundo argumento indica se foi pedido force-refresh.
   */
  onConfirm: (
    intent: ConsumeCreditIntent,
    opts?: { forceRefresh?: boolean },
  ) => void;
  /**
   * Disparada quando o utilizador clica em "Abrir análise recente" no
   * estado cache-fresh. Caller deve abrir o snapshot existente SEM
   * consumir crédito (a chamada subsequente é guaranteed cache hit).
   */
  onOpenCached?: (intent: ConsumeCreditIntent) => void;
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
  /** Probed cache state for period intent. */
  periodCacheState?: PeriodCacheStateUi | null;
}

/**
 * Modal de confirmação para consumir 1 crédito Pro — usado pelo sidebar
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
  onOpenCached,
  onEmptyFeedback,
  submitting = false,
  errorMessage = null,
  primaryHandle,
  existingCompetitors = [],
  competitorMax = 2,
  periodCacheState = null,
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

  // ── Period flow: cache-aware copy + CTA matrix ────────────────────
  // Case A — fresh cache exists                   → two CTAs (open + force)
  // Case B — no fresh cache (or unknown)          → single "generate" CTA
  // Case C — balance < 1 + period                 → "Sem créditos" message
  const periodDays = intent.kind === "period" ? intent.days : 30;
  const periodHasFreshCache = isPeriod && !!periodCacheState?.hasFreshCache;
  const ageMs = periodCacheState?.ageMs ?? null;
  const periodAgeCopy = (() => {
    if (!periodHasFreshCache || ageMs == null) return null;
    const minutes = Math.max(1, Math.round(ageMs / 60_000));
    if (minutes < 60) {
      return t("nav.explore.consume_dialog.period_cache_body_minutes", {
        minutes,
      });
    }
    const hours = Math.max(1, Math.round(minutes / 60));
    return t("nav.explore.consume_dialog.period_cache_body_hours", { hours });
  })();

  let title: string;
  let description: string;
  if (isPeriod) {
    if (!hasCredit) {
      // Case C — show explicit "no credits" period copy.
      title = t("nav.explore.consume_dialog.period_empty_title");
      description = t("nav.explore.consume_dialog.period_empty_body", {
        days: periodDays,
      });
    } else if (periodHasFreshCache) {
      // Case A
      title = t("nav.explore.consume_dialog.period_cache_title", {
        days: periodDays,
      });
      description =
        periodAgeCopy ??
        t("nav.explore.consume_dialog.period_cache_body_hours", { hours: 1 });
    } else {
      // Case B
      title = t("nav.explore.consume_dialog.period_new_title", {
        days: periodDays,
      });
      description = t("nav.explore.consume_dialog.period_new_body", {
        days: periodDays,
      });
    }
  } else {
    title = t("nav.explore.consume_dialog.title_competitor");
    description = t("nav.explore.consume_dialog.description_competitor");
  }
  const competitorConfirmCta = t(
    "nav.explore.consume_dialog.cta_use_competitor",
  );

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
    // Period: forceRefresh only when cache is fresh AND user clicked the
    // explicit "generate new" secondary CTA — handled below. Single-CTA
    // path (no fresh cache) defaults to forceRefresh=false.
    onConfirm(intent, { forceRefresh: false });
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
          ) : hasCredit && isPeriod ? (
            <div
              aria-hidden="true"
              className="mb-1 flex size-10 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary"
            >
              <CalendarClock className="size-5" />
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

        {!hasCredit && !atCompetitorLimit ? (
          <div className="space-y-2 rounded-lg border border-border-default bg-surface-muted/60 p-3">
            <p className="text-sm text-content-secondary">
              {t("nav.explore.consume_dialog.empty_usage_intro")}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-content-secondary">
              <li>{t("nav.explore.consume_dialog.empty_usage_refresh")}</li>
              <li>{t("nav.explore.consume_dialog.empty_usage_window")}</li>
              <li>{t("nav.explore.consume_dialog.empty_usage_competitor")}</li>
              <li>{t("nav.explore.consume_dialog.empty_usage_fresh")}</li>
            </ul>
          </div>
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
          <>
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
              <span className="rounded-full bg-surface-muted px-2.5 py-1 text-eyebrow-sm text-content-secondary tabular-nums">
                {t("nav.explore.consume_dialog.balance_label")}: {balance}
              </span>
            </div>
            <p className="text-[11px] text-content-tertiary">
              {periodHasFreshCache
                ? t("nav.explore.consume_dialog.period_cache_note")
                : t("nav.explore.consume_dialog.period_new_note")}
            </p>
          </>
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
            {hasCredit
              ? t("nav.explore.consume_dialog.cta_cancel")
              : t("nav.explore.consume_dialog.cta_close", {
                  defaultValue: "Fechar",
                })}
          </Button>
          {atCompetitorLimit ? null : !hasCredit ? (
            // Case C/D — no credits (period or competitor): single
            // meaningful primary CTA. No duplicate "Cancelar".
            <Button
              onClick={() => {
                onOpenChange(false);
                onEmptyFeedback?.();
              }}
            >
              {t("nav.explore.consume_dialog.empty_cta")}
            </Button>
          ) : isPeriod && periodHasFreshCache ? (
            <>
              {/* Case A — primary "open cached" (0 credits), secondary
                  "generate new" (1 credit, force_refresh). */}
              <Button
                onClick={() => {
                  if (submitting) return;
                  onOpenCached?.(intent);
                }}
                disabled={submitting}
                className="gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    {t("nav.explore.consume_dialog.submitting")}
                  </>
                ) : (
                  <>
                    {t("nav.explore.consume_dialog.period_cache_open_cta")}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (submitting) return;
                  onConfirm(intent, { forceRefresh: true });
                }}
                disabled={submitting}
                className="gap-2"
              >
                {t("nav.explore.consume_dialog.period_cache_force_cta")}
              </Button>
            </>
          ) : (
            // Case B (period, no fresh cache) OR competitor flow.
            <Button
              onClick={handleConfirmClick}
              disabled={submitting || (isCompetitor && !competitorReady)}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  {t("nav.explore.consume_dialog.submitting")}
                </>
              ) : (
                <>
                  {isPeriod
                    ? t("nav.explore.consume_dialog.period_new_cta")
                    : competitorConfirmCta}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}