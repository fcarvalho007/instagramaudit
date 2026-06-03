import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { StepProgress } from "@/components/checkout/step-progress";
import { OfferCard } from "@/components/checkout/offer-card";
import {
  QualificationForm,
  type QualificationValue,
} from "@/components/checkout/qualification-form";
import {
  UpsellInterest,
  type UpsellValue,
} from "@/components/checkout/upsell-interest";
import {
  BillingForm,
  EMPTY_BILLING,
  validateBilling,
  type BillingErrors,
  type BillingValue,
} from "@/components/checkout/billing-form";
import { OrderSummary } from "@/components/checkout/order-summary";
import { createEupagoCheckout } from "@/lib/payments/eupago.functions";
import { trackEvent } from "@/lib/tracking.functions";

const STEP_LABELS = [
  "Confirmar oferta",
  "Qualificação",
  "Interesse opcional",
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
});

export const Route = createFileRoute("/checkout/authority-diagnosis")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Diagnóstico de Autoridade Digital — Checkout" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutFlow,
});

function CheckoutFlow() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const createCheckout = useServerFn(createEupagoCheckout);

  const [step, setStep] = useState(1);
  const [qualification, setQualification] = useState<QualificationValue>({
    objective: null,
    objective_other: "",
    profile_ownership: null,
  });
  const [upsell, setUpsell] = useState<UpsellValue>({
    audit: false,
    workshop: false,
  });
  const [billing, setBilling] = useState<BillingValue>(EMPTY_BILLING);
  const [billingErrors, setBillingErrors] = useState<BillingErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // checkout_started + step_view tracking
  useEffect(() => {
    trackEvent({
      data: {
        eventType: "checkout_started",
        metadata: {
          product_code: "authority_diagnosis_97",
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
        metadata: { step, ...extra },
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

  const qualValid =
    qualification.objective !== null &&
    qualification.profile_ownership !== null &&
    (qualification.objective !== "other" ||
      qualification.objective_other.trim().length > 0);

  const submitPayment = async () => {
    const errors = validateBilling(billing);
    setBillingErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    trackEvent({
      data: {
        eventType: "checkout_payment_started",
        metadata: { product_code: "authority_diagnosis_97" },
      },
    }).catch(() => {});

    try {
      const res = await createCheckout({
        data: {
          product_code: "authority_diagnosis_97",
          instagram_username: search.username,
          report_cache_key: search.report_cache_key,
          return_path: "/checkout/authority-diagnosis?status=success",
          source_component: search.source ?? "checkout_flow",
          coupon_code: search.coupon,
          qualification: {
            objective: qualification.objective ?? "other",
            objective_other: qualification.objective_other.trim() || undefined,
            profile_ownership: qualification.profile_ownership ?? "mine",
          },
          upsell_interest: upsell,
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
          metadata: { error: message },
        },
      }).catch(() => {});
      toast.error(message);
    }
  };

  return (
    <div>
      <StepProgress step={step} total={4} labels={STEP_LABELS} />

      {step === 1 ? (
        <section className="space-y-5">
          <header>
            <h1 className="font-fraunces text-2xl sm:text-3xl font-medium text-content-primary leading-tight">
              Vamos preparar o teu Diagnóstico de Autoridade Digital
            </h1>
            <p className="mt-2 text-sm text-content-secondary leading-relaxed">
              O relatório mostra os dados. A sessão humana ajuda a transformar
              esses dados em prioridades claras.
            </p>
          </header>
          <OfferCard />
          <StepActions
            backLabel={search.return ? "Voltar ao relatório" : "Cancelar"}
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
              Conta-nos um pouco mais
            </h1>
            <p className="mt-2 text-sm text-content-secondary">
              Ajuda-nos a preparar a sessão antes de falarmos.
            </p>
          </header>
          <QualificationForm value={qualification} onChange={setQualification} />
          <StepActions
            backLabel="Voltar"
            onBack={goBack}
            nextLabel="Continuar"
            nextDisabled={!qualValid}
            onNext={() => {
              trackStepComplete({
                objective: qualification.objective,
                profile_ownership: qualification.profile_ownership,
              });
              goNext();
            }}
          />
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-5">
          <header>
            <h1 className="font-fraunces text-2xl font-medium text-content-primary">
              Queres ir além do Instagram?
            </h1>
            <p className="mt-2 text-sm text-content-secondary">
              Marca os temas que te interessam — falamos depois, sem
              compromisso.
            </p>
          </header>
          <UpsellInterest value={upsell} onChange={setUpsell} />
          <StepActions
            backLabel="Voltar"
            onBack={goBack}
            nextLabel="Continuar"
            onNext={() => {
              trackStepComplete({ ...upsell });
              if (upsell.audit || upsell.workshop) {
                trackEvent({
                  data: {
                    eventType: "checkout_upsell_interest",
                    metadata: { ...upsell },
                  },
                }).catch(() => {});
              }
              goNext();
            }}
          />
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-5">
          <header>
            <h1 className="font-fraunces text-2xl font-medium text-content-primary">
              Dados de facturação
            </h1>
            <p className="mt-2 text-sm text-content-secondary">
              Usamos estes dados apenas para emitir o recibo da reserva.
            </p>
          </header>
          <BillingForm
            value={billing}
            onChange={setBilling}
            errors={billingErrors}
          />
          <OrderSummary />
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