import { ArrowRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { CheckoutPrimaryButton } from "@/components/checkout/checkout-primary-button";

interface Props {
  title?: string;
  description?: string;
  primaryLabel?: string;
  primaryTo?: string;
}

/**
 * Guard shown inside the focused checkout layout when no lead session is
 * attached to the visitor. Used by both 9€ and 97€ checkouts.
 */
export function MissingLeadSession({
  title = "Para continuar, começa por criar a tua conta gratuita.",
  description = "Precisamos de uma sessão ativa para associar o pagamento ao teu perfil. Demora menos de um minuto.",
  primaryLabel = "Voltar aos preços",
  primaryTo = "/precos",
}: Props) {
  const navigate = useNavigate();
  return (
    <section className="space-y-6 text-center sm:text-left">
      <header className="space-y-3">
        <h1 className="font-fraunces text-2xl sm:text-3xl font-medium text-content-primary leading-tight">
          {title}
        </h1>
        <p className="text-sm text-content-secondary leading-relaxed">
          {description}
        </p>
      </header>
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <CheckoutPrimaryButton
          type="button"
          onClick={() => navigate({ to: primaryTo }).catch(() => {})}
          className="gap-2"
        >
          {primaryLabel}
          <ArrowRight className="size-4" aria-hidden="true" />
        </CheckoutPrimaryButton>
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate({ to: "/" }).catch(() => {})}
        >
          Analisar perfil
        </Button>
      </div>
    </section>
  );
}