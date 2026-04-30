import { cn } from "@/lib/utils";

/**
 * Strip subtil de CTA no fim do Bloco 02. Aponta para a âncora
 * `#tier-comparison` já existente — não cria flows de pagamento.
 */
export function ReportDiagnosticCta() {
  return (
    <aside
      aria-label="Ver análise completa"
      className={cn(
        "rounded-2xl border border-slate-200/70 bg-white",
        "px-5 py-4 md:px-6 md:py-5",
        "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
        "shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
      )}
    >
      <p className="text-sm md:text-[15px] text-slate-700 leading-relaxed max-w-2xl">
        <span className="font-semibold text-slate-900">Quer aprofundar?</span>{" "}
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