import {
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  Lightbulb,
  Repeat,
  Users,
} from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { PUBLIC_PRODUCTS } from "@/lib/payments/products";
import { usePremiumCta } from "./premium-cta-context";

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

  const priceLabel = PUBLIC_PRODUCTS.report_full_9.priceLabel;

  const benefits = [
    { icon: ArrowUpRight, key: "best_worst" },
    { icon: Repeat, key: "formats" },
    { icon: CalendarClock, key: "rhythm" },
    { icon: Users, key: "competitors" },
    { icon: Lightbulb, key: "opportunities" },
  ] as const;

  return (
    <section
      aria-label={t("end_of_free.eyebrow")}
      className={cn(className)}
    >
      <div
        className={cn(
          "mx-auto max-w-2xl text-center",
          "bg-white border border-border-default rounded-2xl",
          "px-5 py-9 sm:px-10 sm:py-12",
          "shadow-[0_2px_15px_rgba(15,23,42,0.03)]",
        )}
      >
        <p className="text-eyebrow-sm text-content-tertiary">
          {t("end_of_free.eyebrow")}
        </p>

        <h2
          className={cn(
            "mt-5 font-display font-normal leading-tight tracking-[-0.015em]",
            "text-content-primary text-3xl sm:text-4xl md:text-[2.5rem]",
          )}
        >
          {t("end_of_free.title")}
        </h2>

        <p className="mt-4 mx-auto max-w-xl text-[15px] leading-relaxed text-content-secondary">
          <Trans
            t={t}
            i18nKey="end_of_free.description"
            components={{ strong: <strong className="font-semibold text-content-primary" /> }}
          />
        </p>

        <div
          className={cn(
            "mt-7 mx-auto max-w-md text-left",
            "rounded-xl border border-border-default bg-surface-muted/60",
            "px-5 py-5 sm:px-6 sm:py-6",
          )}
        >
          <p className="text-eyebrow-sm text-content-tertiary">
            {t("end_of_free.benefits_title")}
          </p>
          <ul className="mt-3 space-y-2.5">
            {benefits.map(({ icon: Icon, key }) => (
              <li
                key={key}
                className="flex items-start gap-2.5 text-[14px] leading-snug text-content-primary"
              >
                <Icon
                  className="mt-0.5 size-4 shrink-0 text-accent-primary/80"
                  aria-hidden="true"
                />
                <span>{t(`end_of_free.benefits.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex items-baseline justify-center">
          <span className="font-display text-[3rem] sm:text-[3.5rem] leading-none text-content-primary tabular-nums">
            {priceLabel}
          </span>
        </div>

        <p className="mt-2 text-[13px] text-content-secondary">
          {t("end_of_free.price.caption_suffix")}
        </p>

        <div className="mt-6">
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
            {t("end_of_free.cta")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-5 mx-auto max-w-md text-[12.5px] leading-relaxed text-content-tertiary">
          {t("end_of_free.reassurance")}
        </p>
      </div>
    </section>
  );
}