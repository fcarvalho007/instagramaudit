import { Gift } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

/**
 * Inline lead-magnet card placed between Block 1 (free preview) and the
 * gated content. Editorial, low-emphasis: no pricing, no purchase framing,
 * single primary CTA that opens the existing UnlockModal via `onUnlockClick`.
 *
 * Anchored with `id="lead-magnet-card"` so the sidebar "Continuar leitura
 * gratuita" button can scroll-focus it.
 */
export function ReportLeadMagnetCard({
  onUnlockClick,
  className,
}: {
  onUnlockClick: () => void;
  className?: string;
}) {
  const { t } = useTranslation("report");
  return (
    <section
      id="lead-magnet-card"
      aria-label={t("nav.lead_magnet.title")}
      className={cn("mt-2 md:mt-4 pb-6 md:pb-0", className)}
    >
      <p className="mx-auto max-w-3xl text-center text-sm leading-relaxed text-content-secondary">
        {t("nav.lead_magnet.transition")}
      </p>

      <div
        className={cn(
          "mx-auto mt-5 max-w-3xl text-center",
          "bg-surface-secondary border border-border-default rounded-2xl",
          "px-6 py-7 sm:px-8 sm:py-8",
        )}
      >
        <p className="text-eyebrow-sm text-content-tertiary inline-flex items-center justify-center gap-1.5">
          <Gift className="size-3.5" aria-hidden="true" />
          {t("nav.lead_magnet.eyebrow")}
        </p>

        <h2
          className={cn(
            "mt-3 font-display italic font-normal leading-tight",
            "text-content-primary text-2xl sm:text-3xl",
          )}
        >
          {t("nav.lead_magnet.title")}
        </h2>

        <p className="mt-3 mx-auto max-w-xl text-[15px] leading-relaxed text-content-secondary">
          {t("nav.lead_magnet.body")}
        </p>

        <div className="mt-6">
          <button
            type="button"
            onClick={onUnlockClick}
            aria-label={t("nav.lead_magnet.cta_aria")}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-lg",
              "bg-content-primary px-5 py-2.5 text-sm font-semibold text-white",
              "hover:bg-content-primary/90 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1",
            )}
          >
            {t("nav.lead_magnet.cta")}
          </button>
        </div>
      </div>
    </section>
  );
}