import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createEupagoCheckout } from "@/lib/payments/eupago.functions";
import { trackEvent } from "@/lib/tracking.functions";
import {
  PUBLIC_PRODUCTS,
  type ProductCode,
} from "@/lib/payments/products";

interface Props {
  productCode: ProductCode;
  sourceComponent: string;
  instagramUsername?: string | null;
  reportCacheKey?: string | null;
  returnPath?: string;
  className?: string;
  label?: string;
  /** Optional discount coupon validated server-side. */
  couponCode?: string | null;
}

/**
 * Single CTA that creates an EuPago checkout for the current lead and
 * redirects the browser to the returned checkout URL.
 */
export function ReserveDiagnosisButton({
  productCode,
  sourceComponent,
  instagramUsername,
  reportCacheKey,
  returnPath,
  className,
  label,
  couponCode,
}: Props) {
  const createCheckout = useServerFn(createEupagoCheckout);
  const [loading, setLoading] = useState(false);

  const product = PUBLIC_PRODUCTS[productCode];
  const buttonLabel =
    label ??
    (productCode === "authority_diagnosis_97"
      ? "Reservar diagnóstico"
      : `Comprar ${product.namePt}`);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    trackEvent({
      data: {
        eventType: "payment_cta_clicked",
        metadata: {
          product_code: productCode,
          source_component: sourceComponent,
        },
      },
    }).catch(() => {});

    try {
      const res = await createCheckout({
        data: {
          product_code: productCode,
          instagram_username: instagramUsername ?? undefined,
          report_cache_key: reportCacheKey ?? undefined,
          return_path: returnPath,
          source_component: sourceComponent,
          coupon_code: couponCode ?? undefined,
        },
      });

      if (res?.checkout_url) {
        window.location.assign(res.checkout_url);
        return;
      }
      throw new Error("Resposta inválida do servidor");
    } catch (err) {
      setLoading(false);
      const message =
        err instanceof Error
          ? err.message
          : "Não foi possível iniciar o pagamento.";
      toast.error(message);
    }
  };

  return (
    <Button
      type="button"
      variant="primary"
      onClick={handleClick}
      disabled={loading}
      className={cn("gap-2", className)}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <>
          {buttonLabel}
          <ArrowRight className="size-4" aria-hidden="true" />
        </>
      )}
    </Button>
  );
}