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
import { createEupagoCheckout } from "@/lib/payments/eupago.functions";
import { getLeadSessionStatus } from "@/lib/leads/lead-session.functions";
import { trackEvent } from "@/lib/tracking.functions";

const PRODUCT_CODE = "report_full_9" as const;

const STEP_LABELS = [
  "Confirmar desbloqueio",
  "Faturação",
  "Confirmar e pagar",
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
  const [billing, setBilling] = useState<BillingValue>(EMPTY_BILLING);
  const [billingErrors, setBillingErrors] = useState<BillingErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent({
      data: {
        eventType: "checkout_started",
        metadata: {
          product_code: PRODUCT_CODE,
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

  const trackStepComplete = (extra: Record<string, unknown> = {}) => {
    trackEvent({
      data: {
        eventType: "checkout_step_complete",
        metadata: { step, product_code: PRODUCT_CODE, ...extra },
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

  const submitPayment = async () => {
    const errors = validateBilling(billing);
    setBillingErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    trackEvent({
      data: {
        eventType: "checkout_payment_started",
        metadata: { product_code: PRODUCT_CODE },
      },
    }).catch(() => {});

    try {
      const res = await createCheckout({
        data: {
          product_code: PRODUCT_CODE,
          instagram_username: search.username,
          report_cache_key: search.report_cache_key,
          return_path: "/checkout/report-full?status=success",
          source_component: search.source ?? "checkout_report_full",
          coupon_code: search.coupon,
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
          metadata: { product_code: PRODUCT_CODE, error: message },
        },
      }).catch(() => {});
      toast.error(message);
    }
  };

  return (
    <div>
      <StepProgress step={step} total={3} labels={STEP_LABELS} />

      {step === 1 ? (
        <section className="space-y-5">
          <header>
            <h1 className="font-fraunces text-2xl sm:text-3xl font-medium text-content-primary leading-tight">
              Obter relatório completo
            </h1>
            <p className="mt-2 text-sm text-content-secondary leading-relaxed">
              Desbloqueia o diagnóstico editorial, desempenho, conteúdo,
              procura, comparação e recomendações.
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
              Dados de facturação
            </h1>
            <p className="mt-2 text-sm text-content-secondary">
              Usamos estes dados apenas para emitir o recibo do relatório.
            </p>
          </header>
          <BillingForm
            value={billing}
            onChange={setBilling}
            errors={billingErrors}
          />
          <StepActions
            backLabel="Voltar"
            onBack={goBack}
            nextLabel="Continuar"
            onNext={() => {
              const errors = validateBilling(billing);
              setBillingErrors(errors);
              if (Object.keys(errors).length > 0) return;
              trackStepComplete();
              goNext();
            }}
          />
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-5">
          <header>
            <h1 className="font-fraunces text-2xl font-medium text-content-primary">
              Confirmar e pagar
            </h1>
            <p className="mt-2 text-sm text-content-secondary">
              Verifica o resumo. Em seguida abrimos o pagamento seguro.
            </p>
          </header>
          <OrderSummary productCode={PRODUCT_CODE} />
          {submitError ? (
            <p className="text-sm text-signal-error">{submitError}</p>
          ) : null}
          <div className="flex items-center justify-between gap-3 pt-2">
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
              className="gap-2"
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