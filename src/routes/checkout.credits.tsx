import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { queryOptions, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Coins, Gift, Info, Loader2, Lock } from "lucide-react";
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
import { CheckoutAccountGate } from "@/components/checkout/checkout-account-gate";
import { createEupagoCheckout } from "@/lib/payments/eupago.functions";
import { getLeadSessionStatus } from "@/lib/leads/lead-session.functions";
import { getMyCreditBalance } from "@/lib/credits/credits.functions";
import { trackEvent } from "@/lib/tracking.functions";
import { PUBLIC_PRODUCTS, type ProductCode } from "@/lib/payments/products";

/**
 * TEMPORARY LAUNCH OFFER — durante o lançamento controlado expomos um
 * único SKU `credit_pack_1` (1 crédito · 9€). O webhook concede +2
 * créditos extra (bónus de lançamento, não anunciado antes do pagamento).
 * Os packs `credits_3 / credits_10 / credits_25` ficam reservados no
 * enum mas não aparecem aqui.
 */
const PACKS = [
  {
    id: "credit_pack_1",
    code: "credit_pack_1" as ProductCode,
    credits: 1,
    priceEur: 9,
    priceLabel: "9€",
  },
] as const;

type PackId = (typeof PACKS)[number]["id"];
// Schema aceita também os SKUs reservados (`credits_3 / 10 / 25`) para
// não quebrar links antigos ou tabs abertos; o componente normaliza
// sempre para `credit_pack_1`.
const PACK_QUERY_VALUES = [
  "credit_pack_1",
  "credits_3",
  "credits_10",
  "credits_25",
] as const;
const DEFAULT_PACK: PackId = "credit_pack_1";

const LAUNCH_BONUS_CREDITS = 2;

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
  pack: z.enum(PACK_QUERY_VALUES).optional(),
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
  const queryClient = useQueryClient();
  if (search.status === "success") {
    return (
      <PostPurchaseSuccessPanel
        returnPath={search.return ?? "/"}
        packId={search.pack === "credit_pack_1" ? "credit_pack_1" : null}
      />
    );
  }
  if (!leadStatus.hasLead) {
    return (
      <CheckoutAccountGate
        productCode="credit_pack_1"
        exitPath={search.return ?? "/precos"}
        onSignedIn={() => {
          queryClient.invalidateQueries({
            queryKey: leadSessionQueryOptions.queryKey,
          });
        }}
      />
    );
  }
  return <CheckoutSteps />;
}

function CheckoutSteps() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const createCheckout = useServerFn(createEupagoCheckout);

  // Single-SKU launch flow: ignore `?pack=` overrides that no longer
  // map to an exposed product and always fall back to `credit_pack_1`.
  const selectedPackId: PackId = DEFAULT_PACK;
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
    // Banner "Não-Pro" — até termos um sinal server-side fiável de
    // entitlement Pro (ex: `report_full_9` activo no lead), mostramos
    // sempre. Tracking permite medir frequência e refinar mais tarde.
    trackEvent({
      data: {
        eventType: "credits_pack_non_pro_warning_shown",
        metadata: {
          pack_id: selectedPack.id,
          source_component: search.source ?? null,
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

        <div className="rounded-xl border border-accent-primary/40 bg-white p-5 max-w-xl">
          <div className="flex items-center gap-2">
            <Coins
              className="size-4 text-accent-primary"
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-content-primary tabular-nums">
              {selectedPack.credits} crédito · pagamento único
            </span>
          </div>
          <p className="mt-2 font-fraunces text-3xl font-medium text-content-primary tabular-nums leading-none">
            {selectedPack.priceLabel}
          </p>
          <p className="mt-2 text-xs text-content-tertiary">
            Pagamento único. Sem subscrição.
          </p>
        </div>

        <aside
          role="note"
          className="rounded-xl border border-border-default bg-surface-muted p-5 max-w-xl flex items-start gap-3"
        >
          <Info
            className="size-5 text-content-tertiary mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div className="text-sm text-content-secondary leading-relaxed">
            <p className="text-eyebrow-sm text-content-tertiary">
              Antes de comprar
            </p>
            <p className="mt-1 font-semibold text-content-primary">
              Os créditos só fazem sentido se já tiveres acesso Pro.
            </p>
            <p className="mt-1">
              Cada crédito permite gerar uma nova análise Pro (mudar período,
              adicionar concorrente, forçar nova recolha). Se ainda não
              desbloqueaste o relatório completo, começa por aí.
            </p>
            <div className="mt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/precos" }).catch(() => {})}
              >
                Ver opções Pro
              </Button>
            </div>
          </div>
        </aside>

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
          note={`${selectedPack.credits} crédito${selectedPack.credits === 1 ? "" : "s"} · pagamento único`}
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
  const purchased = packId ? getPack(packId).credits : 1;
  // TEMPORARY LAUNCH OFFER — durante o lançamento, `credit_pack_1`
  // recebe +2 créditos bónus aplicados pelo webhook
  // (`grantCreditPackLaunchBonus`). A copy e o total esperado são
  // específicos a este SKU; ver `credits.server.ts`.
  const isLaunchOffer = packId === "credit_pack_1" || packId === null;
  const launchBonus = isLaunchOffer ? LAUNCH_BONUS_CREDITS : 0;
  const expectedTotal = purchased + launchBonus;

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

  const EXPECTED_TOTAL = expectedTotal > 0 ? expectedTotal : 1;
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
          {`Adicionámos ${purchased} crédito${purchased === 1 ? "" : "s"} à tua conta.`}{" "}
          Volta ao relatório e gera a tua análise quando quiseres.
        </p>
        {isLaunchOffer ? (
          <p className="inline-flex items-start gap-2 rounded-lg border border-accent-primary/30 bg-accent-primary/5 px-3 py-2 text-sm text-content-primary">
            <Gift
              className="size-4 text-accent-primary mt-0.5 shrink-0"
              aria-hidden="true"
            />
            <span>
              Oferta de lançamento aplicada: recebeste{" "}
              <strong className="tabular-nums">{LAUNCH_BONUS_CREDITS}</strong>{" "}
              créditos extra.
            </span>
          </p>
        ) : null}
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