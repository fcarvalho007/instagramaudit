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
  return (
    <div className={wrapperClass}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-content-tertiary mb-3">
        Resumo da encomenda
      </h3>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-content-secondary leading-snug">
          {product.namePt}
        </span>
        <span className="text-sm font-semibold text-content-primary tabular-nums">
          {product.priceLabel}
        </span>
      </div>
      <p className="mt-1 text-xs text-content-tertiary">
        Pagamento único · Sem subscrição
      </p>
      <div className="mt-3 pt-3 border-t border-border-default flex items-baseline justify-between">
        <span className="text-sm font-semibold text-content-primary">
          Total
        </span>
        <span className="text-lg font-bold text-content-primary tabular-nums">
          {product.priceLabel}
        </span>
      </div>
      <p className="mt-2 text-xs text-content-tertiary">
        {note}
      </p>
    </div>
  );
}