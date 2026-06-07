import { ShieldCheck } from "lucide-react";

import { PUBLIC_PRODUCTS, type ProductCode } from "@/lib/payments/products";

interface Props {
  productCode?: ProductCode;
  note?: string;
  sticky?: boolean;
}

export function OrderSummary({
  productCode = "authority_diagnosis_97",
  note = "pagamento único · sem subscrição",
  sticky = false,
}: Props = {}) {
  const product = PUBLIC_PRODUCTS[productCode];
  const wrapperClass = sticky
    ? "rounded-xl border border-border-default bg-white p-4 lg:sticky lg:top-6"
    : "rounded-xl border border-border-default bg-white p-4";
  const compareAtLabel =
    productCode === "authority_diagnosis_97" ? "149€" : null;
  return (
    <div className={wrapperClass}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-content-tertiary mb-3">
        Resumo da encomenda
      </h3>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-content-secondary leading-snug">
          {product.namePt}
        </span>
        <span className="flex items-baseline gap-2 whitespace-nowrap">
          {compareAtLabel ? (
            <span className="font-fraunces text-sm text-content-tertiary line-through tabular-nums">
              {compareAtLabel}
            </span>
          ) : null}
          <span className="text-sm font-semibold text-content-primary tabular-nums">
            {product.priceLabel}
          </span>
        </span>
      </div>
      <p className="mt-1 text-xs text-content-tertiary">
        Pagamento único · Sem subscrição
      </p>
      <div className="mt-3 pt-3 border-t border-border-default flex items-baseline justify-between">
        <span className="text-sm font-semibold text-content-primary">
          Total
        </span>
        <span className="font-fraunces text-2xl font-medium text-content-primary tabular-nums leading-none">
          {product.priceLabel}
        </span>
      </div>
      <p className="mt-2 text-xs text-content-tertiary">
        {note}
      </p>
      <div className="mt-4 pt-3 border-t border-border-default space-y-1.5">
        <p className="flex items-center gap-1.5 text-xs text-content-secondary">
          <ShieldCheck
            className="size-3.5 text-accent-primary"
            aria-hidden="true"
          />
          Pagamento seguro via EuPago
        </p>
        <p className="text-xs text-content-tertiary">
          Multibanco · MB WAY · Cartão
        </p>
      </div>
    </div>
  );
}