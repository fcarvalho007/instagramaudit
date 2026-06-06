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
          "mx-auto max-w-xl text-center",
          "border border-border-subtle/70 rounded-2xl",
          "px-6 py-12 sm:px-12 sm:py-16",
          "shadow-[0_8px_40px_-12px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.04)]",
        )}
        style={{
          background:
            "linear-gradient(180deg, #FFFFFF 0%, #F8FAFE 100%)",
        }}
      >
        <p className="text-eyebrow-sm text-content-tertiary">
          {t("end_of_free.eyebrow")}
        </p>

        <h2
          className={cn(
            "mt-5 font-display font-semibold tracking-[-0.02em]",
            "text-content-primary text-[2.25rem] sm:text-[3rem] md:text-[3.5rem] leading-[1.05]",
          )}
        >
          {t("end_of_free.title")}
        </h2>

        <p className="mt-5 mx-auto max-w-lg text-[17px] sm:text-[18px] leading-relaxed text-content-secondary">
          <Trans
            t={t}
            i18nKey="end_of_free.description"
            components={{ strong: <strong className="font-semibold text-content-primary" /> }}
          />
        </p>

        <ul className="mt-9 mx-auto max-w-sm text-left space-y-3">
          {benefits.map(({ icon: Icon, key }) => (
            <li
              key={key}
              className="flex items-start gap-3 text-[14.5px] leading-snug text-content-primary"
            >
              <Icon
                className="mt-0.5 size-4 shrink-0 text-content-tertiary"
                aria-hidden="true"
              />
              <span>{t(`end_of_free.benefits.${key}`)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex items-baseline justify-center">
          <span className="font-sans font-semibold text-[4rem] sm:text-[4.5rem] leading-none tabular-nums text-accent-primary">
            {priceLabel}
          </span>
        </div>

        <p className="mt-3 text-[12px] uppercase tracking-[0.14em] text-content-tertiary">
          {t("end_of_free.price.caption_suffix")}
        </p>

        <div className="mt-8">
          <button
            type="button"
            onClick={openInterest}
            className={cn(
              "inline-flex items-center gap-2 rounded-full",
              "bg-accent-primary text-white",
              "px-7 py-3.5 text-[15px] font-semibold",
              "hover:bg-accent-primary/90 transition-colors",
              "shadow-[0_12px_32px_-12px_rgba(55,114,229,0.6)]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2",
            )}
          >
            {t("end_of_free.cta")}
            <ArrowRight className="size-4.5" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-6 mx-auto max-w-sm text-[12.5px] leading-relaxed text-content-tertiary">
          {t("end_of_free.reassurance")}
        </p>
      </div>
    </section>
  );
}