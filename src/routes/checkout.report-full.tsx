import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { CheckoutPrimaryButton } from "@/components/checkout/checkout-primary-button";
import { StepProgress } from "@/components/checkout/step-progress";
import { ConfirmUnlockCard } from "@/components/checkout/confirm-unlock-card";
import {
  ReportPlanChooser,
  type ReportPlanCode,
} from "@/components/checkout/report-plan-chooser";
import {
  BillingForm,
  EMPTY_BILLING,
  validateBilling,
  type BillingErrors,
  type BillingValue,
} from "@/components/checkout/billing-form";
import { OrderSummary } from "@/components/checkout/order-summary";
import { CheckoutAccountGate } from "@/components/checkout/checkout-account-gate";
import {
  ReportPriorityForm,
  GOAL_TO_LEGACY_PRIORITY,
  type ReportGoal,
} from "@/components/checkout/report-priority-form";
import { HumanDiagnosisUpsell } from "@/components/checkout/human-diagnosis-upsell";
import { createEupagoCheckout } from "@/lib/payments/eupago.functions";
import { getCheckoutIdentityStatus } from "@/lib/leads/checkout-identity.functions";
import { trackEvent } from "@/lib/tracking.functions";
import type { ProductCode } from "@/lib/payments/products";

const SOURCE_PRODUCT = "report_full_9" satisfies ProductCode;
const UPSELL_TARGET: ProductCode = "authority_diagnosis_97";

const STEP_LABELS = [
  "Confirmar desbloqueio",
  "Objectivo",
  "Leitura humana?",
  "Faturação",
];

const searchSchema = z.object({
  username: z.string().trim().min(1).max(60).optional(),
  report_cache_key: z.string().trim().min(1).max(200).optional(),
  return: z
    .string()
    .trim()
    .max(200)
    .regex(/^\/[A-Za-z0-9/_\-.?=&%]*$/)
    .optional(),
  source: z.string().trim().min(1).max(80).optional(),
  coupon: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
  status: z.enum(["success"]).optional(),
});

/**
 * Identidade do checkout (Ronda 11B.1): aceita `lead_session` (global) ou
 * `report_capture_session` (scoped ao relatório indicado em
 * `report_cache_key`). A sessão scoped nunca é promovida a global.
 */
const identityQueryOptions = (reportRef?: string) =>
  queryOptions({
    queryKey: ["checkout", "lead-session", reportRef ?? null],
    queryFn: () =>
      getCheckoutIdentityStatus({
        data: reportRef ? { report_cache_key: reportRef } : {},
      }),
    staleTime: 0,
  });

export const Route = createFileRoute("/checkout/report-full")({
  validateSearch: (search) => searchSchema.parse(search),
  loaderDeps: ({ search }) => ({ reportRef: search.report_cache_key }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(identityQueryOptions(deps.reportRef)),
  head: () => ({
    meta: [
      { title: "Relatório completo — Checkout" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutFlow,
});

function CheckoutFlow() {
  const search = Route.useSearch();
  const { data: identityStatus } = useSuspenseQuery(
    identityQueryOptions(search.report_cache_key),
  );
  const queryClient = useQueryClient();
  if (search.status === "success") {
    return (
      <PostPurchaseSuccessPanel
        returnPath={search.return ?? "/app/reports"}
      />
    );
  }
  if (identityStatus.identity === "none") {
    return (
      <CheckoutAccountGate
        productCode={SOURCE_PRODUCT}
        exitPath={search.return ?? "/precos"}
        onSignedIn={() => {
          queryClient.invalidateQueries({
            queryKey: ["checkout", "lead-session"],
          });
        }}
      />
    );
  }
  return <CheckoutSteps identitySource={identityStatus.identity} />;
}

function CheckoutSteps({
  identitySource,
}: {
  identitySource: "lead_session" | "report_capture_session";
}) {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createCheckout = useServerFn(createEupagoCheckout);
  /**
   * Identidade scoped só autoriza o produto ligado a este relatório. Se o
   * utilizador aceitar o upsell (produto global), pedimos conta nesse ponto.
   */
  const [requiresGlobalAccount, setRequiresGlobalAccount] = useState(false);

  const [step, setStep] = useState(1);
  const [reportGoals, setReportGoals] = useState<ReportGoal[]>([]);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductCode>(SOURCE_PRODUCT);
  const [planCode, setPlanCode] = useState<ReportPlanCode>(SOURCE_PRODUCT);
  const [upsellPresented, setUpsellPresented] = useState(false);
  const [upsellAccepted, setUpsellAccepted] = useState(false);
  const [billing, setBilling] = useState<BillingValue>(EMPTY_BILLING);
  const [billingErrors, setBillingErrors] = useState<BillingErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const primaryGoal = reportGoals[0] ?? null;
  const reportPriorityLegacy = primaryGoal
    ? GOAL_TO_LEGACY_PRIORITY[primaryGoal]
    : undefined;

  useEffect(() => {
    trackEvent({
      data: {
        eventType: "checkout_started",
        metadata: {
          product_code: SOURCE_PRODUCT,
          source_component: search.source ?? null,
          instagram_username: search.username ?? null,
        },
      },
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    trackEvent({
      data: {
        eventType: "checkout_step_view",
        metadata: { step, label: STEP_LABELS[step - 1] },
      },
    }).catch(() => {});
  }, [step]);

  // Fire upsell_seen exactly once when the user lands on step 3.
  useEffect(() => {
    if (step === 3 && !upsellPresented) {
      setUpsellPresented(true);
      trackEvent({
        data: {
          eventType: "checkout_upsell_seen",
          metadata: {
            source_product: SOURCE_PRODUCT,
            target_product: UPSELL_TARGET,
            source_component: search.source ?? null,
            instagram_username: search.username ?? null,
            report_cache_key: search.report_cache_key ?? null,
          },
        },
      }).catch(() => {});
    }
  }, [step, upsellPresented, search.source, search.username, search.report_cache_key]);

  const trackStepComplete = (extra: Record<string, unknown> = {}) => {
    trackEvent({
      data: {
        eventType: "checkout_step_complete",
        metadata: { step, product_code: SOURCE_PRODUCT, ...extra },
      },
    }).catch(() => {});
  };

  const goBack = () => {
    if (step === 1) {
      if (search.return) {
        window.location.assign(search.return);
      } else {
        navigate({ to: "/precos" }).catch(() => {});
      }
      return;
    }
    setStep((s) => s - 1);
  };

  const goNext = () => {
    setStep((s) => s + 1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const handleUpsellAccept = () => {
    setSelectedProduct(UPSELL_TARGET);
    setUpsellAccepted(true);
    trackEvent({
      data: {
        eventType: "checkout_upsell_accepted",
        metadata: {
          source_product: SOURCE_PRODUCT,
          target_product: UPSELL_TARGET,
          final_product: UPSELL_TARGET,
          source_component: search.source ?? null,
          instagram_username: search.username ?? null,
          report_cache_key: search.report_cache_key ?? null,
        },
      },
    }).catch(() => {});
    trackStepComplete({ upsell_accepted: true, final_product: UPSELL_TARGET });
    if (identitySource === "report_capture_session") {
      setRequiresGlobalAccount(true);
      return;
    }
    goNext();
  };

  const handleUpsellDecline = () => {
    setSelectedProduct(planCode);
    setUpsellAccepted(false);
    trackEvent({
      data: {
        eventType: "checkout_upsell_declined",
        metadata: {
          source_product: SOURCE_PRODUCT,
          final_product: SOURCE_PRODUCT,
          source_component: search.source ?? null,
          instagram_username: search.username ?? null,
          report_cache_key: search.report_cache_key ?? null,
        },
      },
    }).catch(() => {});
    trackStepComplete({ upsell_accepted: false, final_product: SOURCE_PRODUCT });
    goNext();
  };

  const submitPayment = async () => {
    const errors = validateBilling(billing);
    setBillingErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    trackEvent({
      data: {
        eventType: "checkout_payment_started",
        metadata: {
          product_code: selectedProduct,
          source_product: SOURCE_PRODUCT,
          final_product: selectedProduct,
          upsell_accepted: upsellAccepted,
          checkout_identity_source: identitySource,
        },
      },
    }).catch(() => {});

    try {
      const res = await createCheckout({
        data: {
          product_code: selectedProduct,
          instagram_username: search.username,
          report_cache_key: search.report_cache_key,
          return_path:
            selectedProduct === UPSELL_TARGET
              ? "/checkout/authority-diagnosis?status=success"
              : "/checkout/report-full?status=success",
          source_component: search.source ?? "checkout_report_full",
          coupon_code: search.coupon,
          report_priority: reportPriorityLegacy,
          report_goals: reportGoals.length > 0 ? reportGoals : undefined,
          upsell: {
            presented: upsellPresented,
            accepted: upsellAccepted,
            source_product: SOURCE_PRODUCT,
          },
          billing: {
            name: billing.name.trim(),
            tax_id: billing.tax_id.trim() || undefined,
            address: billing.address.trim(),
            postal_code: billing.postal_code.trim(),
            city: billing.city.trim(),
            invoice_email: billing.invoice_email.trim(),
          },
        },
      });
      if (res?.checkout_url) {
        window.location.assign(res.checkout_url);
        return;
      }
      throw new Error("Resposta inválida do servidor.");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível iniciar o pagamento.";
      setSubmitError(message);
      setSubmitting(false);
      trackEvent({
        data: {
          eventType: "checkout_payment_failed",
          metadata: {
            product_code: selectedProduct,
            source_product: SOURCE_PRODUCT,
            final_product: selectedProduct,
            upsell_accepted: upsellAccepted,
            error: message,
          },
        },
      }).catch(() => {});
      toast.error(message);
    }
  };

  if (requiresGlobalAccount) {
    return (
      <CheckoutAccountGate
        productCode={UPSELL_TARGET}
        exitPath={search.return ?? "/precos"}
        onSignedIn={() => {
          queryClient.invalidateQueries({
            queryKey: ["checkout", "lead-session"],
          });
          setRequiresGlobalAccount(false);
          goNext();
        }}
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <StepProgress step={step} total={4} labels={STEP_LABELS} />

        {step === 1 ? (
          <section className="space-y-5">
            <header>
              <h1 className="font-fraunces text-2xl sm:text-3xl font-medium text-content-primary leading-tight">
                Desbloquear a Análise Pro
              </h1>
              <p className="mt-2 text-sm text-content-secondary leading-relaxed">
                Desbloqueia as secções premium agora — ou compra um pack para
                desbloquear vários relatórios à medida que analisas novos perfis.
              </p>
            </header>
            <ReportPlanChooser
              value={planCode}
              onChange={(code) => {
                setPlanCode(code);
                setSelectedProduct(code);
                setUpsellAccepted(false);
                trackEvent({
                  data: {
                    eventType: "checkout_plan_selected",
                    metadata: {
                      product_code: code,
                      source_product: SOURCE_PRODUCT,
                    },
                  },
                }).catch(() => {});
              }}
            />
            <ConfirmUnlockCard />
            <StepActions
              backLabel={search.return ? "Voltar ao relatório" : "Cancelar"}
              onBack={goBack}
              nextLabel="Confirmar desbloqueio"
              onNext={() => {
                trackStepComplete({ selected_plan: planCode });
                goNext();
              }}
            />
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-5">
            <header>
              <h1 className="font-fraunces text-2xl font-medium text-content-primary">
                O que te traz aqui?
              </h1>
              <p className="mt-2 text-sm text-content-secondary">
                Podes escolher mais do que um. A primeira escolha conta como principal.
              </p>
            </header>
            <ReportPriorityForm
              goals={reportGoals}
              onChange={setReportGoals}
            />
            <StepActions
              backLabel="Voltar"
              onBack={goBack}
              nextLabel="Continuar"
              nextDisabled={reportGoals.length === 0}
              onNext={() => {
                if (reportGoals.length === 0) return;
                trackStepComplete({
                  report_goals: reportGoals,
                  report_priority: reportPriorityLegacy,
                  primary_goal: primaryGoal,
                });
                goNext();
              }}
            />
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-5">
            <header>
              <span className="text-eyebrow-sm text-content-tertiary">
                Opcional
              </span>
              <h1 className="mt-1 font-fraunces text-2xl font-medium text-content-primary">
                Queres uma leitura humana dos dados?
              </h1>
              <p className="mt-2 text-sm text-content-secondary leading-relaxed">
                O relatório mostra os sinais. O diagnóstico humano ajuda a
                transformar esses sinais em 3 prioridades concretas.
              </p>
            </header>
            <HumanDiagnosisUpsell
              onAccept={handleUpsellAccept}
              onDecline={handleUpsellDecline}
            />
            <div className="pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={goBack}
                className="gap-1.5"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Voltar
              </Button>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="space-y-5">
            <header>
              <h1 className="font-fraunces text-2xl font-medium text-content-primary">
                Dados de facturação
              </h1>
              <p className="mt-2 text-sm text-content-secondary">
                Usamos apenas para emitir o recibo. Depois abrimos o
                pagamento seguro.
              </p>
            </header>
            <div className="rounded-xl border border-border-default bg-white p-5 max-w-xl">
              <BillingForm
                value={billing}
                onChange={setBilling}
                errors={billingErrors}
                disabled={submitting}
              />
            </div>

            <div className="lg:hidden">
              <OrderSummary productCode={selectedProduct} />
            </div>

            {submitError ? (
              <div
                role="alert"
                className="rounded-lg border border-signal-error/30 bg-signal-error/5 px-3 py-2 text-sm text-signal-error"
              >
                {submitError}
              </div>
            ) : null}

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={goBack}
                disabled={submitting}
                className="gap-1.5"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Voltar
              </Button>
              <CheckoutPrimaryButton
                type="button"
                onClick={submitPayment}
                disabled={submitting}
                className="gap-2 w-full sm:w-auto"
              >
                {submitting ? (
                  <>
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                    A preparar pagamento…
                  </>
                ) : (
                  <>
                    <Lock className="size-4" aria-hidden="true" />
                    Confirmar e pagar
                  </>
                )}
              </CheckoutPrimaryButton>
            </div>
          </section>
        ) : null}
      </div>

      <aside className="hidden lg:block">
        <OrderSummary productCode={selectedProduct} sticky />
      </aside>
    </div>
  );
}

function StepActions({
  backLabel,
  onBack,
  nextLabel,
  onNext,
  nextDisabled,
}: {
  backLabel: string;
  onBack: () => void;
  nextLabel: string;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <Button type="button" variant="ghost" onClick={onBack} className="gap-1.5">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {backLabel}
      </Button>
      <CheckoutPrimaryButton
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className="gap-2"
      >
        {nextLabel}
        <ArrowRight className="size-4" aria-hidden="true" />
      </CheckoutPrimaryButton>
    </div>
  );
}

function PostPurchaseSuccessPanel({ returnPath }: { returnPath: string }) {
  useEffect(() => {
    trackEvent({
      data: {
        eventType: "post_purchase_view",
        metadata: { product_code: SOURCE_PRODUCT },
      },
    }).catch(() => {});
    trackEvent({
      data: {
        eventType: "post_purchase_bonus_seen",
        metadata: { kind: "post_purchase_beta_bonus" },
      },
    }).catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header className="space-y-2">
        <span className="text-eyebrow-sm text-content-tertiary">
          Pagamento recebido
        </span>
        <h1 className="font-fraunces text-2xl sm:text-3xl font-medium text-content-primary leading-tight">
          A confirmar o pagamento
        </h1>
        <p className="text-sm text-content-secondary leading-relaxed">
          Obrigado pela tua compra. Assim que a confirmação do banco chegar,
          as secções premium abrem automaticamente no teu relatório.
        </p>
      </header>

      <div className="rounded-xl border border-border-default bg-surface-muted p-5 space-y-2">
        <span className="text-eyebrow-sm text-content-tertiary">
          Oferta beta desbloqueada
        </span>
        <p className="text-sm text-content-primary leading-relaxed">
          Como estamos em beta, oferecemos 2 créditos adicionais para
          explorares mais o relatório.
        </p>
        <p className="text-sm text-content-secondary leading-relaxed">
          Podes usar estes créditos para gerar outro período ou adicionar
          concorrentes.
        </p>
      </div>

      <div className="pt-2">
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            const target = returnPath.startsWith("/")
              ? returnPath
              : "/app/reports";
            window.location.assign(target);
          }}
          className="gap-2 w-full sm:w-auto"
        >
          Ver o meu relatório
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}