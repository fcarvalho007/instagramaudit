import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Coins, Loader2, Lock } from "lucide-react";
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
import { getMyCreditBalance } from "@/lib/credits/credits.functions";
import { trackEvent } from "@/lib/tracking.functions";
import { PUBLIC_PRODUCTS, type ProductCode } from "@/lib/payments/products";

const PACKS = [
  { id: "credits_3", code: "credits_3" as ProductCode, credits: 3, priceEur: 9, priceLabel: "9€" },
  { id: "credits_10", code: "credits_10" as ProductCode, credits: 10, priceEur: 25, priceLabel: "25€" },
  { id: "credits_25", code: "credits_25" as ProductCode, credits: 25, priceEur: 49, priceLabel: "49€" },
] as const;

type PackId = (typeof PACKS)[number]["id"];
const PACK_IDS = PACKS.map((p) => p.id) as readonly PackId[];
const DEFAULT_PACK: PackId = "credits_3";

function getPack(id: PackId) {
  return PACKS.find((p) => p.id === id) ?? PACKS[0];
}

type IntendedAction =
  | "period_change"
  | "competitor_add"
  | "force_refresh"
  | "generic_pro_analysis";

const searchSchema = z.object({
  return: z
    .string()
    .trim()
    .max(200)
    .regex(/^\/[A-Za-z0-9/_\-.?=&%]*$/)
    .optional(),
  source: z.string().trim().min(1).max(80).optional(),
  status: z.enum(["success"]).optional(),
  pack: z.enum(PACK_IDS as unknown as [PackId, ...PackId[]]).optional(),
  intent: z
    .enum([
      "period_change",
      "competitor_add",
      "force_refresh",
      "generic_pro_analysis",
    ])
    .optional(),
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
    return (
      <PostPurchaseSuccessPanel
        returnPath={search.return ?? "/"}
        packId={search.pack ?? null}
      />
    );
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

  const initialPackId: PackId = search.pack ?? DEFAULT_PACK;
  const [selectedPackId, setSelectedPackId] = useState<PackId>(initialPackId);
  const selectedPack = getPack(selectedPackId);
  const intendedAction: IntendedAction = search.intent ?? "generic_pro_analysis";

  const [billing, setBilling] = useState<BillingValue>(EMPTY_BILLING);
  const [billingErrors, setBillingErrors] = useState<BillingErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    trackEvent({
      data: {
        eventType: "credits_pack_checkout_started",
        metadata: {
          product_code: selectedPack.code,
          pack_id: selectedPack.id,
          credits_quantity: selectedPack.credits,
          amount_eur: selectedPack.priceEur,
          intended_action: intendedAction,
          source_component: search.source ?? null,
          return_path: search.return ?? null,
        },
      },
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPack.code]);

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

    const successParams = new URLSearchParams();
    successParams.set("status", "success");
    successParams.set("pack", selectedPack.id);
    if (search.return) successParams.set("return", search.return);
    const returnPath = `/checkout/credits?${successParams.toString()}`;

    try {
      const res = await createCheckout({
        data: {
          product_code: selectedPack.code,
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

  const product = PUBLIC_PRODUCTS[selectedPack.code];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <header className="space-y-2">
          <span className="text-eyebrow-sm text-content-tertiary">
            Comprar créditos
          </span>
          <h1 className="font-fraunces text-2xl sm:text-3xl font-medium text-content-primary leading-tight">
            Escolhe o teu pack de créditos
          </h1>
          <p className="text-sm text-content-secondary leading-relaxed">
            Cada crédito permite gerar uma nova análise Pro — actualizar o
            relatório, abrir 30 ou 90 dias, adicionar um concorrente ou
            forçar uma nova recolha quando não há cache.
          </p>
        </header>

        <div
          role="radiogroup"
          aria-label="Pack de créditos"
          className="grid gap-3 sm:grid-cols-3"
        >
          {PACKS.map((pack) => {
            const checked = pack.id === selectedPackId;
            const perCredit = (pack.priceEur / pack.credits).toLocaleString(
              "pt-PT",
              { minimumFractionDigits: 2, maximumFractionDigits: 2 },
            );
            return (
              <button
                key={pack.id}
                type="button"
                role="radio"
                aria-checked={checked}
                onClick={() => setSelectedPackId(pack.id)}
                className={
                  "relative text-left rounded-xl border bg-white p-4 transition-colors " +
                  (checked
                    ? "border-accent-primary ring-2 ring-accent-primary/30"
                    : "border-border-default hover:border-content-tertiary")
                }
              >
                {checked ? (
                  <span
                    aria-hidden="true"
                    className="absolute top-3 right-3 inline-flex size-5 items-center justify-center rounded-full bg-accent-primary text-white"
                  >
                    <Check className="size-3" />
                  </span>
                ) : null}
                <div className="flex items-center gap-2">
                  <Coins
                    className="size-4 text-accent-primary"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-content-primary tabular-nums">
                    {pack.credits} créditos
                  </span>
                </div>
                <p className="mt-2 font-fraunces text-2xl font-medium text-content-primary tabular-nums leading-none">
                  {pack.priceLabel}
                </p>
                <p className="mt-1 text-xs text-content-tertiary tabular-nums">
                  ≈ {perCredit}€/crédito
                </p>
              </button>
            );
          })}
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
          <OrderSummary productCode={selectedPack.code} />
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
          productCode={selectedPack.code}
          note={`${selectedPack.credits} créditos · pagamento único`}
          sticky
        />
      </aside>
    </div>
  );
}

function PostPurchaseSuccessPanel({
  returnPath,
  packId,
}: {
  returnPath: string;
  packId: PackId | null;
}) {
  const fetchBalance = useServerFn(getMyCreditBalance);
  const startedAt = useState(() => Date.now())[0];
  const purchased = packId ? getPack(packId).credits : 0;

  useEffect(() => {
    trackEvent({
      data: {
        eventType: "credits_pack_post_purchase_view",
        metadata: {
          pack_id: packId,
          credits_quantity: purchased,
        },
      },
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const target = returnPath.startsWith("/") ? returnPath : "/";

  const EXPECTED_TOTAL = purchased > 0 ? purchased : 1;
  const POLL_WINDOW_MS = 10_000;

  const balanceQuery = useQuery({
    queryKey: ["my-credit-balance", "post-purchase"],
    queryFn: () => fetchBalance(),
    refetchInterval: (query) => {
      const data = query.state.data;
      const balance = data?.hasLead ? data.balance : 0;
      if (balance >= EXPECTED_TOTAL) return false;
      if (Date.now() - startedAt > POLL_WINDOW_MS) return false;
      return 1500;
    },
    refetchIntervalInBackground: false,
    staleTime: 0,
    gcTime: 0,
  });

  const balance = balanceQuery.data?.hasLead ? balanceQuery.data.balance : 0;
  const waiting =
    balance < EXPECTED_TOTAL && Date.now() - startedAt <= POLL_WINDOW_MS;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header className="space-y-2">
        <span className="text-eyebrow-sm text-content-tertiary">
          Pagamento confirmado
        </span>
        <h1 className="font-fraunces text-2xl sm:text-3xl font-medium text-content-primary leading-tight">
          Créditos adicionados com sucesso
        </h1>
        <p className="text-sm text-content-secondary leading-relaxed">
          Obrigado pela tua compra.{" "}
          {purchased > 0
            ? `Adicionámos ${purchased} crédito${purchased === 1 ? "" : "s"} à tua conta.`
            : "Os créditos já estão disponíveis na tua conta."}{" "}
          Volta ao relatório e gera a tua análise quando quiseres.
        </p>
        <p
          className="text-sm text-content-secondary leading-relaxed tabular-nums"
          aria-live="polite"
        >
          {waiting ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              A actualizar saldo…
            </span>
          ) : (
            <>Saldo actualizado: {balance} créditos.</>
          )}
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