import { ArrowRight, BarChart3, Bell, FileText, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { usePremiumCta } from "./premium-cta-context";

// Preços do lançamento (waitlist). Hardcoded até existir checkout real.
const LAUNCH_PRICE = "7";
const LIST_PRICE = "19";
const CURRENCY = "€";

/**
 * Marca o fim do relatório público (gratuito). Sinaliza ao leitor que
 * terminou a leitura disponível, mas que há mais a caminho no Premium
 * (em desenvolvimento). Sem CTA agressivo: um único link discreto que
 * abre o mesmo PremiumInterestDialog já usado nos callouts PRO para
 * captar sinal de procura sem prometer datas.
 *
 * Posicionado em `report-shell-v2.tsx` no fim de `<main>`, apenas
 * em variantes não-gated (no gated, o paywall já comunica "há mais").
 */
export function ReportEndOfFreeBlock({ className }: { className?: string }) {
  const { handlePremiumAccessClick } = usePremiumCta();
  const { t } = useTranslation("report");

  const openInterest = () => {
    handlePremiumAccessClick("lock_gate", {
      cta: "guarantee_launch_price",
    });
  };

  const chips = [
    { icon: Users, label: t("end_of_free.chips.competitors") },
    { icon: BarChart3, label: t("end_of_free.chips.rank") },
    { icon: FileText, label: t("end_of_free.chips.more_sections") },
  ];

  return (
    <section
      aria-label={t("end_of_free.eyebrow")}
      className={cn(className)}
    >
      <div
        className={cn(
          "mx-auto max-w-3xl text-center",
          "bg-white border border-border-default rounded-2xl",
          "px-6 py-10 sm:px-12 sm:py-12",
          "shadow-[0_2px_15px_rgba(15,23,42,0.03)]",
        )}
      >
        <p className="text-eyebrow-sm text-content-tertiary">
          {t("end_of_free.eyebrow")}
        </p>

        <h2
          className={cn(
            "mt-5 font-display italic font-normal leading-tight",
            "text-content-primary text-3xl sm:text-4xl md:text-[2.5rem]",
          )}
        >
          {t("end_of_free.title")}
        </h2>

        <p className="mt-5 mx-auto max-w-xl text-[15px] leading-relaxed text-content-secondary">
          {t("end_of_free.description")}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {chips.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full",
                "bg-surface-muted text-content-secondary",
                "ring-1 ring-border-default px-3 py-1.5",
                "text-[12px] font-medium",
              )}
            >
              <Icon className="size-3.5 text-accent-primary/80" aria-hidden="true" />
              {label}
            </span>
          ))}
        </div>

        <div className="mt-8 flex items-baseline justify-center gap-3">
          <span className="font-display text-[3.25rem] sm:text-[3.75rem] leading-none text-content-primary">
            {LAUNCH_PRICE}
            {CURRENCY}
          </span>
          <span className="text-lg text-content-tertiary line-through tabular-nums">
            {LIST_PRICE}
            {CURRENCY}
          </span>
        </div>

        <p className="mt-2 text-[13px] text-content-tertiary">
          {t("end_of_free.price.caption_prefix")}{" "}
          <span className="text-content-secondary">
            {t("end_of_free.price.caption_suffix")}
          </span>
        </p>

        <div className="mt-7">
          <button
            type="button"
            onClick={openInterest}
            className={cn(
              "inline-flex items-center gap-2 rounded-full",
              "bg-accent-primary text-white",
              "px-6 py-3 text-sm font-semibold",
              "hover:bg-accent-primary/90 transition-colors",
              "shadow-[0_8px_24px_-12px_rgba(55,114,229,0.55)]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2",
            )}
          >
            {t("nav.access.cta")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-5 inline-flex items-center gap-2 text-[12px] text-content-tertiary">
          <Bell className="size-3.5" aria-hidden="true" />
          {t("end_of_free.footnote")}
        </p>
      </div>
    </section>
  );
}