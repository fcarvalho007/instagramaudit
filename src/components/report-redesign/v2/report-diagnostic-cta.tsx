import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

/**
 * Strip subtil de CTA no fim do Bloco 02. Aponta para a âncora
 * `#leitura-completa` do `TierComparisonBlock` — não cria flows
 * de pagamento.
 */
export function ReportDiagnosticCta() {
  const { t } = useTranslation("report");
  return (
    <aside
      aria-label={t("diagnostic.cta_aria")}
      className={cn(
        "rounded-2xl border border-border-default bg-surface-secondary",
        "px-5 py-4 md:px-6 md:py-5",
        "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
        "shadow-card",
      )}
    >
      <p className="text-sm md:text-[15px] text-content-secondary leading-relaxed max-w-2xl">
        <span className="font-semibold text-content-primary">{t("diagnostic.cta_lead")}</span>{" "}
        {t("diagnostic.cta_body")}
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
        {t("diagnostic.cta_button")}
        <span aria-hidden>→</span>
      </a>
    </aside>
  );
}
