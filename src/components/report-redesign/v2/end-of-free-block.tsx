import { ArrowRight, CalendarClock, ListChecks, Stethoscope } from "lucide-react";
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
  const { goToProCheckout } = usePremiumCta();
  const { t } = useTranslation("report");

  // Percurso directo: CTA → checkout de 9€, sem modal intermédio.
  const openInterest = () => goToProCheckout("lock_gate");

  const priceLabel = PUBLIC_PRODUCTS.report_full_9.priceLabel;

  // Apenas benefícios garantidos pelo `report_full_9`. Concorrentes e
  // "oportunidades" saíram por serem condicionais (auditoria 03A).
  const benefits = [
    { icon: Stethoscope, key: "diagnosis" },
    { icon: ListChecks, key: "priorities" },
    { icon: CalendarClock, key: "rhythm" },
  ] as const;

  return (
    <section aria-label={t("end_of_free.eyebrow")} className={cn(className)}>
      <div
        className={cn(
          "mx-auto max-w-2xl",
          "border border-border-subtle/70 rounded-2xl",
          "px-6 py-9 sm:px-10 sm:py-11",
          "shadow-[0_8px_40px_-16px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.04)]",
        )}
        style={{
          background: "linear-gradient(180deg, #FFFFFF 0%, #F8FAFE 100%)",
        }}
      >
        <p className="text-eyebrow-sm text-accent-primary">{t("end_of_free.eyebrow")}</p>

        <h2
          className={cn(
            "mt-3 font-display font-semibold tracking-[-0.02em]",
            "text-content-primary text-[1.75rem] sm:text-[2.125rem] leading-[1.12]",
          )}
        >
          {t("end_of_free.title")}
        </h2>

        <p className="mt-3 max-w-xl text-[15.5px] sm:text-[16px] leading-relaxed text-content-secondary">
          <Trans
            t={t}
            i18nKey="end_of_free.description"
            components={{ strong: <strong className="font-semibold text-content-primary" /> }}
          />
        </p>

        <ul className="mt-6 space-y-2.5">
          {benefits.map(({ icon: Icon, key }) => (
            <li
              key={key}
              className="flex items-start gap-2.5 text-[14.5px] leading-snug text-content-primary"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-accent-primary" aria-hidden="true" />
              <span>{t(`end_of_free.benefits.${key}`)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-baseline gap-2">
            <span className="font-sans font-semibold text-[2rem] leading-none tabular-nums text-content-primary">
              {priceLabel}
            </span>
            <span className="text-[12.5px] text-content-tertiary">
              {t("end_of_free.price.caption_suffix")}
            </span>
          </div>

          <button
            type="button"
            onClick={openInterest}
            className={cn(
              "inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full",
              "bg-accent-primary text-white",
              "px-7 py-3.5 text-[15px] font-semibold min-h-[48px]",
              "hover:bg-accent-primary/90 transition-colors",
              "shadow-[0_12px_32px_-14px_rgba(55,114,229,0.6)]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2",
            )}
          >
            {t("end_of_free.cta")}
            <ArrowRight className="size-4.5" aria-hidden="true" />
          </button>
        </div>

        <p className="mt-4 text-[12.5px] leading-relaxed text-content-tertiary">
          {t("end_of_free.reassurance")}
        </p>
      </div>
    </section>
  );
}
