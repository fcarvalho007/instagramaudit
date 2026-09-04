import { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { trackEvent } from "@/lib/tracking.functions";
import { getMyCreditBalance } from "@/lib/credits/credits.functions";
import { fetchPublicAnalysis } from "@/lib/analysis/client";
import { usePublicAppConfig } from "@/lib/config/use-app-config";
import { getPeriodCacheState } from "@/lib/analysis/period-cache.functions";

import { usePremiumCta } from "./premium-cta-context";
import type {
  ConsumeCreditIntent,
  PeriodCacheStateUi,
} from "./consume-credit-dialog";

/**
 * Contrato de acções "Explorar" do relatório (período + concorrente).
 *
 * Extraído tal e qual da `ExploreSection` em `report-block-nav.tsx` para
 * poder ser reutilizado pela chrome Editorial V2 sem duplicar regras de
 * negócio, créditos ou tracking. Nenhum evento, ordem, texto ou fluxo foi
 * alterado nesta extracção.
 */

/**
 * Pro windows surfaced as chips in the sidebar. 90d is gated by the
 * `pro_window_90d_enabled` flag (see `usePublicAppConfig`).
 */
export const PREMIUM_WINDOWS_ALL = [30, 90] as const;

// TODO: centralisar este limite num módulo partilhado (ex.: lib/config) quando
// existir um sítio óbvio.
export const COMPETITOR_MAX = 2;

const ADMIN_SIMULATED_BALANCE = 999_999;

export interface UseReportExploreActionsArgs {
  premiumUnlocked: boolean;
  competitorCount: number;
  primaryHandle?: string;
  existingCompetitors?: string[];
  isAdminPreview?: boolean;
  /**
   * Search params extra a preservar nas navegações internas do relatório
   * (ex.: `report_design=editorial_v2` na pré-visualização). Produção não
   * passa nada, mantendo o comportamento actual inalterado.
   */
  preserveSearch?: Record<string, unknown>;
}

export function useReportExploreActions({
  premiumUnlocked,
  competitorCount,
  primaryHandle,
  existingCompetitors = [],
  isAdminPreview = false,
  preserveSearch,
}: UseReportExploreActionsArgs) {
  const { t } = useTranslation("report");
  const { handlePremiumAccessClick } = usePremiumCta();
  const fetchBalance = useServerFn(getMyCreditBalance);
  const [balance, setBalance] = useState(
    isAdminPreview ? ADMIN_SIMULATED_BALANCE : 0,
  );
  const [intent, setIntent] = useState<ConsumeCreditIntent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [periodCacheState, setPeriodCacheState] =
    useState<PeriodCacheStateUi | null>(null);
  const navigate = useNavigate();
  const { proWindow90dEnabled } = usePublicAppConfig();
  const premiumWindows = useMemo<readonly number[]>(
    () => (proWindow90dEnabled ? PREMIUM_WINDOWS_ALL : [30]),
    [proWindow90dEnabled],
  );
  const probePeriodCache = useServerFn(getPeriodCacheState);

  const extraSearch = useMemo(
    () => preserveSearch ?? {},
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(preserveSearch ?? {})],
  );

  // Carrega o saldo de créditos beta apenas no estado paid — nunca antes
  // da compra, para nunca revelar o bónus ao utilizador free.
  useEffect(() => {
    if (!premiumUnlocked) return;
    // Admin preview: never call the server, keep the simulated balance.
    if (isAdminPreview) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchBalance();
        if (!cancelled && r.hasLead) setBalance(r.balance);
      } catch {
        /* sem créditos visíveis em caso de falha */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [premiumUnlocked, fetchBalance, isAdminPreview]);

  const refreshBalance = useCallback(async () => {
    if (isAdminPreview) return;
    try {
      const r = await fetchBalance();
      if (r.hasLead) setBalance(r.balance);
    } catch {
      /* ignore */
    }
  }, [fetchBalance, isAdminPreview]);

  const openConsumeDialog = useCallback(
    (nextIntent: ConsumeCreditIntent) => {
      setIntent(nextIntent);
      setErrorMessage(null);
      setPeriodCacheState(null);
      setDialogOpen(true);
      trackEvent({
        data: {
          eventType: "credit_consume_dialog_opened",
          metadata: {
            intent_kind: nextIntent.kind,
            intent_days:
              nextIntent.kind === "period" ? nextIntent.days : undefined,
            balance,
          },
        },
      }).catch(() => {});
      // Probe cache state for the period flow so the dialog can render
      // Case A (fresh cache available) vs Case B (no fresh cache). Fail
      // silently → dialog falls back to "Generate analysis · 1 credit".
      if (nextIntent.kind === "period" && primaryHandle) {
        const windowKind: "30d" | "90d" =
          nextIntent.days === 90 ? "90d" : "30d";
        probePeriodCache({
          data: {
            handle: primaryHandle,
            competitors: existingCompetitors,
            window: windowKind,
          },
        })
          .then((state) => {
            setPeriodCacheState({
              hasFreshCache: state.hasFreshCache,
              ageMs: state.ageMs,
            });
            // Keep balance in sync — the probe already read it server-side.
            if (typeof state.balance === "number") setBalance(state.balance);
          })
          .catch(() => {});
      }
    },
    [balance, existingCompetitors, primaryHandle, probePeriodCache],
  );

  const onConfirmConsume = useCallback(
    async (
      nextIntent: ConsumeCreditIntent,
      opts: { forceRefresh?: boolean } = {},
    ) => {
      const forceRefresh = !!opts.forceRefresh;
      if (nextIntent.kind === "period") {
        const days = nextIntent.days;
        const windowKind: "30d" | "90d" = days === 90 ? "90d" : "30d";
        if (!primaryHandle) {
          setErrorMessage(t("nav.explore.consume_dialog.error_generic"));
          return;
        }
        if (submitting) return;
        setSubmitting(true);
        setErrorMessage(null);
        trackEvent({
          data: {
            eventType: forceRefresh
              ? "beta_period_force_refresh"
              : "beta_credit_intent_period",
            metadata: {
              action_type: "period_analysis",
              days,
              window: windowKind,
              force_refresh: forceRefresh,
            },
          },
        }).catch(() => {});
        try {
          const result = await fetchPublicAnalysis(
            primaryHandle,
            existingCompetitors,
            { window: windowKind, forceRefresh },
          );
          if (result.success) {
            trackEvent({
              data: {
                eventType: "beta_credit_used_period",
                metadata: {
                  action_type: "period_analysis",
                  days,
                  window: windowKind,
                  credit_amount: 1,
                  force_refresh: forceRefresh,
                },
              },
            }).catch(() => {});
            trackEvent({
              data: {
                eventType: "beta_credit_used",
                metadata: {
                  action_type: "period_analysis",
                  days,
                  window: windowKind,
                  credit_amount: 1,
                },
              },
            }).catch(() => {});
            await refreshBalance();
            const ds = (result as { data_source?: string }).data_source;
            const toastKey =
              ds === "cache"
                ? "nav.explore.consume_dialog.period_success_toast_cache"
                : ds === "fresh"
                  ? "nav.explore.consume_dialog.period_success_toast_fresh"
                  : "nav.explore.consume_dialog.period_success_toast_neutral";
            toast.success(t(toastKey));
            setDialogOpen(false);
            // Update URL with `w=` so the route loader re-fetches the
            // window-scoped snapshot. The second analyze call from the
            // loader is a guaranteed cache hit (same cache_key) and
            // does NOT consume an additional credit.
            navigate({
              to: "/analyze/$username",
              params: { username: primaryHandle },
              search: (prev: Record<string, unknown>) => ({
                ...prev,
                ...extraSearch,
                w: windowKind,
              }),
              replace: false,
            }).catch(() => {});
          } else {
            trackEvent({
              data: {
                eventType: "beta_credit_use_failed",
                metadata: {
                  action_type: "period_analysis",
                  days,
                  window: windowKind,
                  error_code: result.error_code,
                  force_refresh: forceRefresh,
                },
              },
            }).catch(() => {});
            await refreshBalance();
            if (result.error_code === "WINDOW_REQUIRES_PRO") {
              setErrorMessage(
                t("nav.explore.consume_dialog.period_error_requires_pro"),
              );
            } else if (
              result.error_code === "WINDOW_90D_BUDGET_EXCEEDED" ||
              result.error_code === "PRO_WINDOW_BUDGET_EXCEEDED"
            ) {
              // Friendly user-facing copy — never mention provider/cost.
              toast.error(
                t("nav.explore.consume_dialog.period_unavailable_toast"),
              );
              setErrorMessage(
                result.error_code === "WINDOW_90D_BUDGET_EXCEEDED"
                  ? t(
                      "nav.explore.consume_dialog.period_error_window_90d_budget",
                    )
                  : t(
                      "nav.explore.consume_dialog.period_error_pro_window_budget",
                    ),
              );
            } else {
              setErrorMessage(
                t("nav.explore.consume_dialog.error_generic_with_code", {
                  code: result.error_code,
                  defaultValue:
                    result.message ??
                    t("nav.explore.consume_dialog.error_generic"),
                }),
              );
            }
          }
        } catch {
          await refreshBalance();
          setErrorMessage(t("nav.explore.consume_dialog.error_generic"));
        } finally {
          setSubmitting(false);
        }
        return;
      }

      // Competitor: chama o endpoint existente, que reserva/confirma/
      // liberta o crédito server-side de forma atómica.
      const newHandle = nextIntent.handle?.trim().toLowerCase();
      if (!newHandle || !primaryHandle) {
        setErrorMessage(t("nav.explore.consume_dialog.error_generic"));
        return;
      }
      if (submitting) return;

      setSubmitting(true);
      setErrorMessage(null);

      trackEvent({
        data: {
          eventType: "beta_credit_intent_competitor",
          metadata: {
            action_type: "competitor_add",
            competitor_handle: newHandle,
            credit_amount: 1,
          },
        },
      }).catch(() => {});

      // Guard defensivo: o botão já deveria estar desactivado em 2/2.
      if (existingCompetitors.length >= COMPETITOR_MAX) {
        setErrorMessage(t("nav.explore.competitor_limit_reached"));
        setSubmitting(false);
        return;
      }
      const competitorList = [...existingCompetitors, newHandle];

      try {
        const result = await fetchPublicAnalysis(primaryHandle, competitorList);

        if (result.success) {
          trackEvent({
            data: {
              eventType: "beta_credit_used_competitor",
              metadata: {
                action_type: "competitor_add",
                competitor_handle: newHandle,
                credit_amount: 1,
              },
            },
          }).catch(() => {});
          trackEvent({
            data: {
              eventType: "beta_credit_used",
              metadata: {
                action_type: "competitor_add",
                competitor_handle: newHandle,
                credit_amount: 1,
              },
            },
          }).catch(() => {});

          await refreshBalance();
          toast.success(t("nav.explore.consume_dialog.success_toast"));
          setDialogOpen(false);

          // Atualiza o URL com a nova lista; o route re-faz fetch
          // (servido do snapshot/cache, sem novo débito de crédito —
          // o endpoint deduplica por (lead_id, cache_key)).
          navigate({
            to: "/analyze/$username",
            params: { username: primaryHandle },
            search: { ...extraSearch, vs: competitorList.join(",") },
            replace: false,
          }).catch(() => {});
        } else {
          trackEvent({
            data: {
              eventType: "beta_credit_use_failed",
              metadata: {
                action_type: "competitor_add",
                competitor_handle: newHandle,
                error_code: result.error_code,
              },
            },
          }).catch(() => {});
          // O servidor já libertou a reserva — refresca o saldo para
          // reflectir o estado real.
          await refreshBalance();
          setErrorMessage(
            t("nav.explore.consume_dialog.error_generic_with_code", {
              code: result.error_code,
              defaultValue:
                result.message ??
                t("nav.explore.consume_dialog.error_generic"),
            }),
          );
        }
      } catch {
        trackEvent({
          data: {
            eventType: "beta_credit_use_failed",
            metadata: {
              action_type: "competitor_add",
              competitor_handle: newHandle,
              error_code: "NETWORK_ERROR",
            },
          },
        }).catch(() => {});
        await refreshBalance();
        setErrorMessage(t("nav.explore.consume_dialog.error_generic"));
      } finally {
        setSubmitting(false);
      }
    },
    [
      primaryHandle,
      existingCompetitors,
      submitting,
      navigate,
      refreshBalance,
      extraSearch,
      t,
    ],
  );

  const onPeriodLockedClick = useCallback(
    (days: number) => {
      handlePremiumAccessClick("sidebar_period", {
        selected_window: `${days}d`,
      });
    },
    [handlePremiumAccessClick],
  );

  const onBuyCredits = useCallback(() => {
    const returnPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/";
    const intendedAction =
      intent?.kind === "period"
        ? "period_change"
        : intent?.kind === "competitor"
          ? "competitor_add"
          : "generic_pro_analysis";
    trackEvent({
      data: {
        eventType: "credits_pack_checkout_intent",
        metadata: {
          source: "report_no_credits_modal",
          intent_kind: intent?.kind ?? null,
          intent_days: intent?.kind === "period" ? intent.days : undefined,
          intended_action: intendedAction,
          return_path: returnPath,
        },
      },
    }).catch(() => {});
    setDialogOpen(false);
    navigate({
      to: "/checkout/credits",
      search: {
        return: returnPath,
        source: "report_no_credits_modal",
        intent: intendedAction,
        pack: "credit_pack_1",
      },
    }).catch(() => {
      // Defensive fallback for environments where the typed router
      // refuses the route — full-page nav still works.
      if (typeof window !== "undefined") {
        const qs = new URLSearchParams({
          return: returnPath,
          source: "report_no_credits_modal",
          intent: intendedAction,
          pack: "credit_pack_1",
        }).toString();
        window.location.assign(`/checkout/credits?${qs}`);
      }
    });
  }, [intent, navigate]);

  const onAddCompetitor = useCallback(() => {
    if (premiumUnlocked) {
      if (competitorCount >= COMPETITOR_MAX) return;
      openConsumeDialog({ kind: "competitor" });
      return;
    }
    handlePremiumAccessClick("sidebar_add_competitor");
  }, [
    premiumUnlocked,
    competitorCount,
    openConsumeDialog,
    handlePremiumAccessClick,
  ]);

  const onPeriodPaidClick = useCallback(
    (days: number) => {
      openConsumeDialog({ kind: "period", days });
    },
    [openConsumeDialog],
  );

  return {
    balance,
    intent,
    dialogOpen,
    setDialogOpen,
    submitting,
    errorMessage,
    periodCacheState,
    premiumWindows,
    competitorMax: COMPETITOR_MAX,
    atMax: premiumUnlocked && competitorCount >= COMPETITOR_MAX,
    onConfirmConsume,
    onBuyCredits,
    onAddCompetitor,
    onPeriodPaidClick,
    onPeriodLockedClick,
  };
}
