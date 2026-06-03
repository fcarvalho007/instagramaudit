export function OrderSummary() {
  return (
    <div className="rounded-xl border border-border-default bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-content-tertiary mb-3">
        Resumo da encomenda
      </h3>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-content-secondary leading-snug">
          Diagnóstico de Autoridade Digital
        </span>
        <span className="text-sm font-semibold text-content-primary tabular-nums">
          97€
        </span>
      </div>
      <div className="mt-3 pt-3 border-t border-border-default flex items-baseline justify-between">
        <span className="text-sm font-semibold text-content-primary">
          Total
        </span>
        <span className="text-lg font-bold text-content-primary tabular-nums">
          97€
        </span>
      </div>
      <p className="mt-2 text-xs text-content-tertiary">
        pagamento único · sem subscrição
      </p>
    </div>
  );
}