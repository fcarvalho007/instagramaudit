import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";

import { OnboardingModal } from "@/components/onboarding/onboarding-modal";
import { OrderSummary } from "@/components/checkout/order-summary";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/tracking.functions";
import type { ProductCode } from "@/lib/payments/products";

interface Props {
  productCode: ProductCode;
  /**
   * Called after the onboarding flow finishes successfully and the
   * `lead_session` cookie is in place.
   *
   * IMPORTANT: this fires *only* after the user has verified the OTP
   * (or magic-link) inside `OnboardingModal` and `/api/onboarding/claim-existing`
   * returned 2xx, meaning the `lead_session` cookie is set server-side.
   * `/api/onboarding/start` alone is not enough — it only seeds the lead
   * and triggers the OTP email; the session is only created at claim time.
   *
   * Caller MUST invalidate (and ideally refetch) the `getLeadSessionStatus`
   * query so the checkout re-renders into `<CheckoutSteps />`. The gate
   * never navigates, so all search params (`source`, `return`, `coupon`,
   * `pack`, `intent`) are preserved in the URL.
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
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    trackEvent({
      data: {
        eventType: "checkout_onboarding_shown",
        metadata: {
          product_code: productCode,
          exit_path: exitPath,
        },
      },
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productCode]);

  const handleSuccess = async () => {
    trackEvent({
      data: {
        eventType: "checkout_onboarding_completed",
        metadata: {
          product_code: productCode,
          exit_path: exitPath,
        },
      },
    }).catch(() => {});
    // Ensure the lead-session query is fresh BEFORE the parent re-renders,
    // so `useSuspenseQuery` immediately sees `hasLead === true` and swaps
    // straight to `<CheckoutSteps />` (avoids a placeholder flash).
    await queryClient.invalidateQueries({ queryKey: ["checkout", "lead-session"] });
    await queryClient.refetchQueries({ queryKey: ["checkout", "lead-session"] });
    onSignedIn();
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <section className="min-w-0 space-y-5">
        <header className="space-y-2">
          <span className="text-eyebrow-sm text-content-tertiary">
            ANTES DE PAGAR
          </span>
          <h1 className="font-fraunces text-2xl sm:text-3xl font-medium text-content-primary leading-tight">
            Continua para o checkout
          </h1>
          <p className="text-sm text-content-secondary leading-relaxed">
            Cria conta ou entra em ~30 segundos. Associamos a tua compra à
            tua conta e enviamos-te o recibo por email.
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
          handleSuccess().catch(() => {
            // Best-effort: even on refetch failure, let parent decide.
            onSignedIn();
          });
        }}
      />
    </div>
  );
}