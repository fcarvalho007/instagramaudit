import { cn } from "@/lib/utils";

/**
 * Strip subtil de CTA no fim do Bloco 02. Aponta para a âncora
 * `#leitura-completa` do `TierComparisonBlock` — não cria flows
 * de pagamento.
 */
export function ReportDiagnosticCta() {
  return (
    <aside
      aria-label="Ver análise completa"
      className={cn(
        "rounded-2xl border border-border-default bg-surface-secondary",
        "px-5 py-4 md:px-6 md:py-5",
        "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
        "shadow-card",
      )}
    >
      <p className="text-sm md:text-[15px] text-content-secondary leading-relaxed max-w-2xl">
        <span className="font-semibold text-content-primary">Quer aprofundar?</span>{" "}
        A versão completa abre cada pergunta em análise por post, exemplos de
        captions e plano de execução a 30 dias.
      </p>
      <a
        href="#leitura-completa"
        className={cn(
          "shrink-0 inline-flex items-center justify-center gap-2 rounded-full",
          "bg-slate-900 px-5 py-3 text-sm font-semibold text-white",
          "transition-colors duration-200 hover:bg-slate-700 min-h-[44px]",
          "w-full md:w-auto",
        )}
      >
        Ver análise completa
        <span aria-hidden>→</span>
      </a>
    </aside>
  );
}
