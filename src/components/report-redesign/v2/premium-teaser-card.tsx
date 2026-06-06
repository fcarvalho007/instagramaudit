import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PUBLIC_PRODUCTS } from "@/lib/payments/products";
import { usePremiumCta, type PremiumCtaSource } from "./premium-cta-context";

export interface PremiumTeaserCardProps {
  /** Section number rendered in the left chip (e.g. "03"). */
  number: string;
  /** Short uppercase category label (e.g. "FREQUÊNCIA EDITORIAL"). */
  eyebrow: string;
  /** Editorial title — visible, not blurred. */
  title: string;
  /** Short value proposition under the title. */
  description: string;
  /** Anchor id so the sidebar TOC can scroll to this card. */
  anchorId: string;
  /** Tracking source forwarded to PremiumCtaProvider. */
  source: PremiumCtaSource;
  className?: string;
}

/**
 * Locked premium teaser card used in the FREE-with-engagement flow.
 * Shows section number, category, title and value prop fully, with a
 * blurred decorative preview and a CTA "Desbloquear por {priceLabel}".
 *
 * Pricing is read from `PUBLIC_PRODUCTS.report_full_9.priceLabel` — never
 * hardcoded. The CTA is wired into `usePremiumCta()` so unlock logic,
 * checkout and entitlements remain untouched.
 */
export function PremiumTeaserCard({
  number,
  eyebrow,
  title,
  description,
  anchorId,
  source,
  className,
}: PremiumTeaserCardProps) {
  const { handlePremiumAccessClick } = usePremiumCta();
  const priceLabel = PUBLIC_PRODUCTS.report_full_9.priceLabel;

  return (
    <section
      id={anchorId}
      className={cn(
        "scroll-mt-24 rounded-2xl border border-border-default bg-surface-base shadow-card",
        "p-5 md:p-7 overflow-hidden",
        className,
      )}
    >
      {/* Header: number chip · eyebrow + title · premium badge */}
      <div className="flex items-start gap-4 md:gap-5">
        <div
          aria-hidden="true"
          className={cn(
            "shrink-0 flex items-center justify-center",
            "size-11 md:size-12 rounded-xl",
            "bg-surface-muted text-content-primary",
            "font-sans font-semibold tabular-nums text-base md:text-lg",
          )}
        >
          {number}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-eyebrow-sm text-accent-primary">{eyebrow}</p>
          <h3 className="mt-1 font-display text-lg md:text-2xl leading-tight text-content-primary">
            {title}
          </h3>
        </div>

        <span
          className={cn(
            "hidden sm:inline-flex items-center gap-1.5 shrink-0",
            "rounded-full border border-border-default bg-surface-muted",
            "px-2.5 py-1 text-[11px] font-medium text-content-secondary",
          )}
        >
          <Lock className="size-3" aria-hidden="true" />
          Premium
        </span>
      </div>

      <p className="mt-3 md:mt-4 text-sm md:text-[15px] leading-relaxed text-content-secondary md:pl-[68px]">
        {description}
      </p>

      {/* Blurred decorative preview + CTA */}
      <div className="relative mt-5 md:mt-6 md:pl-[68px]">
        <div
          aria-hidden="true"
          className="relative h-[96px] md:h-[120px] rounded-xl overflow-hidden bg-surface-muted/60"
        >
          {/* Decorative bars to suggest hidden data */}
          <div className="absolute inset-0 p-4 md:p-5 flex flex-col justify-center gap-2.5 opacity-70 blur-[6px]">
            <div className="h-2.5 rounded-full bg-accent-primary/30 w-[82%]" />
            <div className="h-2.5 rounded-full bg-content-tertiary/25 w-[58%]" />
            <div className="h-2.5 rounded-full bg-accent-primary/20 w-[71%]" />
            <div className="h-2.5 rounded-full bg-content-tertiary/20 w-[44%]" />
          </div>
          {/* Soft fade for readability */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.55) 100%)",
            }}
          />
        </div>

        {/* CTA centered over the blur */}
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            type="button"
            onClick={() => handlePremiumAccessClick(source)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full",
              "bg-surface-base border border-border-default shadow-sm",
              "px-4 py-2 text-sm font-semibold text-content-primary",
              "hover:bg-surface-muted/60 transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2",
            )}
            aria-label={`Desbloquear secção por ${priceLabel}`}
          >
            <Lock className="size-3.5" aria-hidden="true" />
            Desbloquear por {priceLabel}
          </button>
        </div>
      </div>
    </section>
  );
}