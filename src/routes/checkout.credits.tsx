import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Coins, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { CheckoutPrimaryButton } from "@/components/checkout/checkout-primary-button";
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
import { PUBLIC_PRODUCTS, type ProductCode } from "@/lib/payments/products";

const PRODUCT: ProductCode = "credit_pack_1";

const searchSchema = z.object({
  return: z
    .string()
    .trim()
    .max(200)
    .regex(/^\/[A-Za-z0-9/_\-.?=&%]*$/)
    .optional(),
  source: z.string().trim().min(1).max(80).optional(),
  status: z.enum(["success"]).optional(),
});

const leadSessionQueryOptions = queryOptions({
  queryKey: ["checkout", "lead-session"],
  queryFn: () => getLeadSessionStatus(),
  staleTime: 0,
});

export const Route = createFileRoute("/checkout/credits")({
  validateSearch: (search) => searchSchema.parse(search),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData(leadSessionQueryOptions),
  head: () => ({
    meta: [
      { title: "Comprar crédito — Checkout" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutCreditsFlow,
});

function CheckoutCreditsFlow() {
  const { data: leadStatus } = useSuspenseQuery(leadSessionQueryOptions);
  const search = Route.useSearch();
  if (search.status === "success") {
    return <PostPurchaseSuccessPanel returnPath={search.return ?? "/"} />;
  }
  if (!leadStatus.hasLead) {
    return (
      <MissingLeadSession
        title="Para comprar créditos, começa por criar a tua conta gratuita."
        description="Precisamos de uma sessão ativa para associar os créditos ao teu perfil. Demora menos de um minuto."
      />
    );
  }
  return <CheckoutSteps />;
}

function CheckoutSteps() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const createCheckout = useServerFn(createEupagoCheckout);

  const [billing, setBilling] = useState<BillingValue>(EMPTY_BILLING);
  const [billingErrors, setBillingErrors] = useState<BillingErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent({
      data: {
        eventType: "credits_pack_checkout_started",
        metadata: {
          product_code: PRODUCT,
          source_component: search.source ?? null,
          return_path: search.return ?? null,
        },
      },
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goBack = () => {
    if (search.return) {
      window.location.assign(search.return);
      return;
    }
    navigate({ to: "/" }).catch(() => {});
  };

  const submitPayment = async () => {
    const errors = validateBilling(billing);
    setBillingErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);

    const returnPath = search.return
      ? `/checkout/credits?status=success&return=${encodeURIComponent(search.return)}`
      : "/checkout/credits?status=success";

    try {
      const res = await createCheckout({
        data: {
          product_code: PRODUCT,
          return_path: returnPath,
          source_component: search.source ?? "report_no_credits_modal",
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
      toast.error(message);
    }
  };

  const product = PUBLIC_PRODUCTS[PRODUCT];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <header className="space-y-2">
          <span className="text-eyebrow-sm text-content-tertiary">
            Comprar crédito
          </span>
          <h1 className="font-fraunces text-2xl sm:text-3xl font-medium text-content-primary leading-tight">
            {product.namePt}
          </h1>
          <p className="text-sm text-content-secondary leading-relaxed">
            Adiciona 1 crédito à tua conta para gerar uma análise extra de
            período ou adicionar um concorrente no relatório Pro.
          </p>
        </header>

        <div className="rounded-xl border border-border-default bg-white p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className="flex size-9 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary"
            >
              <Coins className="size-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-content-primary">
                1 crédito adicional
              </p>
              <p className="text-xs text-content-tertiary">
                Usável imediatamente após o pagamento. Não expira.
              </p>
            </div>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="font-fraunces text-xl font-medium text-content-primary">
            Dados de facturação
          </h2>
          <p className="text-sm text-content-secondary">
            Usamos apenas para emitir o recibo. Depois abrimos o pagamento
            seguro.
          </p>
          <div className="rounded-xl border border-border-default bg-white p-5 max-w-xl">
            <BillingForm
              value={billing}
              onChange={setBilling}
              errors={billingErrors}
            />
          </div>
        </section>

        <div className="lg:hidden">
          <OrderSummary productCode={PRODUCT} />
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
      </div>

      <aside className="hidden lg:block">
        <OrderSummary
          productCode={PRODUCT}
          note="1 crédito · pagamento único"
          sticky
        />
      </aside>
    </div>
  );
}

function PostPurchaseSuccessPanel({ returnPath }: { returnPath: string }) {
  useEffect(() => {
    trackEvent({
      data: {
        eventType: "credits_pack_post_purchase_view",
        metadata: { product_code: PRODUCT },
      },
    }).catch(() => {});
  }, []);

  const target = returnPath.startsWith("/") ? returnPath : "/";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header className="space-y-2">
        <span className="text-eyebrow-sm text-content-tertiary">
          Pagamento confirmado
        </span>
        <h1 className="font-fraunces text-2xl sm:text-3xl font-medium text-content-primary leading-tight">
          Crédito adicionado
        </h1>
        <p className="text-sm text-content-secondary leading-relaxed">
          Obrigado pela tua compra. O crédito já está disponível na tua
          conta — podes voltar ao relatório e gerar a tua análise.
        </p>
      </header>

      <div className="pt-2">
        <Button
          type="button"
          variant="primary"
          onClick={() => {
            window.location.assign(target);
          }}
          className="gap-2 w-full sm:w-auto"
        >
          Voltar ao relatório
        </Button>
      </div>
    </div>
  );
}