import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { OrderSummary } from "@/components/checkout/order-summary";
import { Button } from "@/components/ui/button";
import type { ProductCode } from "@/lib/payments/products";

interface Props {
  productCode: ProductCode;
  /**
   * Called after the onboarding flow finishes successfully and the
   * `lead_session` cookie is in place. Caller should invalidate the
   * `getLeadSessionStatus` query so the checkout re-renders into
   * `<CheckoutSteps />`.
   */
  onSignedIn: () => void;
  /**
   * Path the user is taken to if they explicitly dismiss the gate.
   * Defaults to `/precos`.
   */
  exitPath?: string;
}

/**
 * Inline replacement for `MissingLeadSession` in the focused checkout
 * routes. Renders the `OnboardingModal` immediately (purpose="checkout",
 * no handle) on top of a soft placeholder so the visitor never sees a
 * dead-end "create account" screen. When the flow completes, `onSignedIn`
 * triggers a refetch of the lead-session status and the checkout
 * advances into the billing step without losing query params
 * (`source`, `return`, `coupon`).
 */
export function CheckoutAccountGate({
  productCode,
  onSignedIn,
  exitPath = "/precos",
}: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section className="min-w-0 space-y-5">
        <header className="space-y-2">
          <span className="text-eyebrow-sm text-content-tertiary">
            Antes de pagar
          </span>
          <h1 className="font-fraunces text-2xl sm:text-3xl font-medium text-content-primary leading-tight">
            Cria a tua conta para continuar
          </h1>
          <p className="text-sm text-content-secondary leading-relaxed">
            Demora cerca de 30 segundos. Precisamos do teu email para te
            enviarmos o recibo e dar acesso ao relatório na tua conta
            privada.
          </p>
        </header>

        <div className="rounded-xl border border-border-default bg-white p-5 flex items-start gap-3 max-w-xl">
          <ShieldCheck
            className="size-5 text-accent-primary mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div className="text-sm text-content-secondary leading-relaxed">
            <p className="font-semibold text-content-primary">
              Sem subscrição. Sem cobrança automática.
            </p>
            <p className="mt-1">
              Apagas a conta quando quiseres. Cumprimos o RGPD e não
              partilhamos o teu email.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:items-center pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate({ to: exitPath }).catch(() => {})}
          >
            Voltar
          </Button>
          {!open ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => setOpen(true)}
            >
              Retomar criação de conta
            </Button>
          ) : null}
        </div>
      </section>

      <aside className="hidden lg:block">
        <OrderSummary productCode={productCode} sticky />
      </aside>

      <OnboardingModal
        open={open}
        onOpenChange={setOpen}
        handle=""
        purpose="checkout"
        onSuccess={() => {
          onSignedIn();
        }}
      />
    </div>
  );
}