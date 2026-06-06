import { Lock, X } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { PUBLIC_PRODUCTS } from "@/lib/payments/products";
import { usePremiumCta } from "./premium-cta-context";

/**
 * Hook that drives the sticky bar visibility.
 * - Shows when the first premium teaser card (`#frequencia`) enters the
 *   viewport — that's exactly the moment the user crosses from the free
 *   Engagement section into the locked teaser zone.
 * - Hides while `#lead-magnet-card` (final paywall CTA) is in view, so
 *   the sticky doesn't compete with the main CTA.
 * - If `#frequencia` is not in the DOM (PRO / internal lab), the bar
 *   stays hidden — the shell additionally gates the mount.
 */
function useStickyUnlockTrigger() {
  const [passedFree, setPassedFree] = useState(false);
  const [finalCtaVisible, setFinalCtaVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("IntersectionObserver" in window)) return;

    let teaserObserver: IntersectionObserver | undefined;
    let finalObserver: IntersectionObserver | undefined;

    // Retry briefly: the teaser card mounts asynchronously after the
    // initial render (loader → snapshot → adapter), so the anchor may
    // not exist yet on first effect run.
    let attempts = 0;
    const wire = () => {
      const teaser = document.getElementById("frequencia");
      const finalCta = document.getElementById("lead-magnet-card");

      if (teaser && !teaserObserver) {
        teaserObserver = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (entry?.isIntersecting) setPassedFree(true);
          },
          { rootMargin: "0px 0px -10% 0px", threshold: 0 },
        );
        teaserObserver.observe(teaser);
      }

      if (finalCta && !finalObserver) {
        finalObserver = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (entry) setFinalCtaVisible(entry.isIntersecting);
          },
          { rootMargin: "0px 0px -80px 0px", threshold: 0 },
        );
        finalObserver.observe(finalCta);
      }

      if ((!teaser || !finalCta) && attempts < 20) {
        attempts += 1;
        window.setTimeout(wire, 250);
      }
    };
    wire();

    return () => {
      teaserObserver?.disconnect();
      finalObserver?.disconnect();
    };
  }, []);

  return { passedFree, finalCtaVisible };
}

/**
 * Compact sticky conversion bar shown to free users while they scroll
 * through the locked premium teaser cards. Reads price from
 * `PUBLIC_PRODUCTS.report_full_9.priceLabel` and routes the CTA through
 * `usePremiumCta()` (source: `sticky_unlock_bar`). Does not change any
 * checkout, pricing, entitlement or unlock logic.
 */
export function StickyUnlockBar() {
  const { handlePremiumAccessClick } = usePremiumCta();
  const { passedFree, finalCtaVisible } = useStickyUnlockTrigger();
  const [dismissed, setDismissed] = useState(false);

  const priceLabel = PUBLIC_PRODUCTS.report_full_9.priceLabel;
  const visible = passedFree && !finalCtaVisible && !dismissed;

  const handleUnlock = () => handlePremiumAccessClick("sticky_unlock_bar");

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30",
        "pointer-events-none",
        "transition-[opacity,transform] duration-200 ease-out",
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2 pointer-events-none",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Desktop variant */}
      <div
        className={cn(
          "hidden md:block",
          "pointer-events-auto",
          "bg-surface-base border-t border-border-default",
          "shadow-[0_-8px_24px_-12px_rgba(3,4,94,0.10)]",
        )}
      >
        <div className="mx-auto max-w-[1520px] px-6 lg:px-8 py-3 flex items-center gap-5">
          <div className="hidden md:flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
            <Lock className="size-4 text-content-secondary" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-content-primary truncate">
              Faltam-te 5 secções premium
            </p>
            <p className="text-xs text-content-secondary truncate">
              frequência, formatos, publicações-chave e prioridades
            </p>
          </div>
          <div className="shrink-0 flex items-baseline gap-1.5">
            <span className="text-base font-semibold tabular-nums text-content-primary">
              {priceLabel}
            </span>
            <span className="text-xs text-content-tertiary">único</span>
          </div>
          <button
            type="button"
            onClick={handleUnlock}
            className={cn(
              "shrink-0 inline-flex items-center rounded-full",
              "bg-accent-primary text-white",
              "px-5 py-2 text-sm font-semibold",
              "hover:bg-accent-primary/90 transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2",
            )}
          >
            Desbloquear
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Fechar barra"
            className={cn(
              "shrink-0 inline-flex items-center justify-center",
              "size-8 rounded-full text-content-tertiary",
              "hover:bg-surface-muted hover:text-content-secondary transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40",
            )}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mobile variant — sits above the bottom tabs bar (64px) */}
      <div
        className={cn(
          "md:hidden pointer-events-auto",
          "mx-3 mb-[72px] rounded-xl",
          "bg-surface-base border border-border-default",
          "shadow-[0_8px_24px_-12px_rgba(3,4,94,0.18)]",
        )}
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
            <Lock className="size-3.5 text-content-secondary" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-content-primary truncate">
              5 secções por desbloquear
            </p>
            <p className="text-[11px] text-content-secondary truncate">
              {priceLabel} · pagamento único
            </p>
          </div>
          <button
            type="button"
            onClick={handleUnlock}
            className={cn(
              "shrink-0 inline-flex items-center rounded-full",
              "bg-accent-primary text-white",
              "px-3.5 py-1.5 text-xs font-semibold",
              "hover:bg-accent-primary/90 transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2",
            )}
          >
            Ver tudo
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Fechar barra"
            className="shrink-0 inline-flex items-center justify-center size-7 rounded-full text-content-tertiary hover:bg-surface-muted hover:text-content-secondary transition-colors"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}