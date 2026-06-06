import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { StepProgress } from "@/components/checkout/step-progress";
import { ConfirmUnlockCard } from "@/components/checkout/confirm-unlock-card";
import {
  BillingForm,
  EMPTY_BILLING,
  validateBilling,
  type BillingErrors,
  type BillingValue,
} from "@/components/checkout/billing-form";
import { OrderSummary } from "@/components/checkout/order-summary";
import { MissingLeadSession } from "@/components/checkout/missing-lead-session";
import {
  ReportPriorityForm,
  type ReportPriority,
} from "@/components/checkout/report-priority-form";
import { HumanDiagnosisUpsell } from "@/components/checkout/human-diagnosis-upsell";
import { createEupagoCheckout } from "@/lib/payments/eupago.functions";
import { getLeadSessionStatus } from "@/lib/leads/lead-session.functions";
import { trackEvent } from "@/lib/tracking.functions";
import type { ProductCode } from "@/lib/payments/products";

const SOURCE_PRODUCT: ProductCode = "report_full_9";
const UPSELL_TARGET: ProductCode = "authority_diagnosis_97";

const STEP_LABELS = [
  "Confirmar desbloqueio",
  "Prioridade",
  "Leitura humana?",
  "Faturação e pagamento",
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

const leadSessionQueryOptions = queryOptions({
  queryKey: ["checkout", "lead-session"],
  queryFn: () => getLeadSessionStatus(),
  staleTime: 0,
});

export const Route = createFileRoute("/checkout/report-full")({
  validateSearch: (search) => searchSchema.parse(search),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(leadSessionQueryOptions),
  head: () => ({
    meta: [
      { title: "Relatório completo — Checkout" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutFlow,
});

function CheckoutFlow() {
  const { data: leadStatus } = useSuspenseQuery(leadSessionQueryOptions);
  const search = Route.useSearch();
  if (search.status === "success") {
    return (
      <PostPurchaseSuccessPanel
        returnPath={search.return ?? "/app/reports"}
      />
    );
  }
  if (!leadStatus.hasLead) {
    return (
      <MissingLeadSession
        title="Para desbloquear o relatório, começa por criar a tua conta gratuita."
        description="Precisamos de uma sessão ativa para associar o relatório ao teu perfil. Demora menos de um minuto."
      />
    );
  }
  return <CheckoutSteps />;
}

function CheckoutSteps() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const createCheckout = useServerFn(createEupagoCheckout);

  const [step, setStep] = useState(1);
  const [reportPriority, setReportPriority] =
    useState<ReportPriority | null>(null);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductCode>(SOURCE_PRODUCT);
  const [upsellPresented, setUpsellPresented] = useState(false);
  const [upsellAccepted, setUpsellAccepted] = useState(false);
  const [billing, setBilling] = useState<BillingValue>(EMPTY_BILLING);
  const [billingErrors, setBillingErrors] = useState<BillingErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
    goNext();
  };

  const handleUpsellDecline = () => {
    setSelectedProduct(SOURCE_PRODUCT);
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
          report_priority: reportPriority ?? undefined,
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

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <StepProgress step={step} total={4} labels={STEP_LABELS} />

        {step === 1 ? (
          <section className="space-y-5">
            <header>
              <h1 className="font-fraunces text-2xl sm:text-3xl font-medium text-content-primary leading-tight">
                Obter relatório completo
              </h1>
              <p className="mt-2 text-sm text-content-secondary leading-relaxed">
                Desbloqueia as secções premium e transforma a visão inicial
                num diagnóstico completo.
              </p>
            </header>
            <ConfirmUnlockCard />
            <StepActions
              backLabel={search.return ? "Voltar" : "Cancelar"}
              onBack={goBack}
              nextLabel="Continuar"
              onNext={() => {
                trackStepComplete();
                goNext();
              }}
            />
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-5">
            <header>
              <h1 className="font-fraunces text-2xl font-medium text-content-primary">
                Por onde queres começar?
              </h1>
              <p className="mt-2 text-sm text-content-secondary">
                Uma escolha rápida para destacarmos a secção certa primeiro.
              </p>
            </header>
            <ReportPriorityForm
              value={reportPriority}
              onChange={setReportPriority}
            />
            <StepActions
              backLabel="Voltar"
              onBack={goBack}
              nextLabel="Continuar"
              nextDisabled={!reportPriority}
              onNext={() => {
                if (!reportPriority) return;
                trackStepComplete({ report_priority: reportPriority });
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
              <Button
                type="button"
                variant="primary"
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
                    Confirmar e pagar
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                )}
              </Button>
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
      <Button
        type="button"
        variant="primary"
        onClick={onNext}
        disabled={nextDisabled}
        className="gap-2"
      >
        {nextLabel}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Button>
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
          Pagamento confirmado
        </span>
        <h1 className="font-fraunces text-2xl sm:text-3xl font-medium text-content-primary leading-tight">
          Relatório desbloqueado
        </h1>
        <p className="text-sm text-content-secondary leading-relaxed">
          Obrigado pela tua compra. Já tens acesso a todas as secções do
          relatório completo.
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