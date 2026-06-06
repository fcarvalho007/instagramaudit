import { Lock, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { PUBLIC_PRODUCTS } from "@/lib/payments/products";
import { usePremiumCta } from "./premium-cta-context";

/**
 * Single source of truth for premium teaser anchors. Must mirror the
 * `PREMIUM_TEASERS` array in `report-overview-block.tsx`. Used both for
 * the visibility trigger (1st item = scroll-in anchor) and for the
 * progress indicator (`TOTAL = ids.length`).
 */
const PREMIUM_TEASER_IDS = [
  "frequencia",
  "formatos",
  "publicacoes-chave",
  "diagnostico-editorial",
  "prioridades",
] as const;

const DISMISS_KEY = "sticky_unlock_bar:dismissed";

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
 * Tracks which premium teaser anchors have entered the viewport at least
 * once during this session. One-shot: an anchor stays "seen" after the
 * first intersection, so scrolling back up does not reset progress.
 */
function useTeaserProgress(ids: ReadonlyArray<string>) {
  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) return;

    const observers: IntersectionObserver[] = [];
    let attempts = 0;

    const wire = () => {
      let missing = false;
      ids.forEach((id) => {
        const node = document.getElementById(id);
        if (!node) {
          missing = true;
          return;
        }
        if (node.dataset.stickyObserved === "1") return;
        node.dataset.stickyObserved = "1";
        const obs = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (entry?.isIntersecting) {
              setSeen((prev) => {
                if (prev.has(id)) return prev;
                const next = new Set(prev);
                next.add(id);
                return next;
              });
              obs.disconnect();
            }
          },
          { rootMargin: "0px 0px -20% 0px", threshold: 0 },
        );
        obs.observe(node);
        observers.push(obs);
      });
      if (missing && attempts < 20) {
        attempts += 1;
        window.setTimeout(wire, 250);
      }
    };
    wire();

    return () => {
      observers.forEach((o) => o.disconnect());
      ids.forEach((id) => {
        const node = document.getElementById(id);
        if (node) delete node.dataset.stickyObserved;
      });
    };
  }, [ids]);

  return seen;
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
  const ids = useMemo(() => PREMIUM_TEASER_IDS, []);
  const seen = useTeaserProgress(ids);
  const total = ids.length;
  const viewed = Math.min(seen.size, total);
  const remaining = Math.max(0, total - viewed);

  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === "1") {
        setDismissed(true);
      }
    } catch {
      /* sessionStorage may be unavailable (private mode) — ignore. */
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const priceLabel = PUBLIC_PRODUCTS.report_full_9.priceLabel;
  const visible = passedFree && !finalCtaVisible && !dismissed;

  const handleUnlock = () => handlePremiumAccessClick("sticky_unlock_bar");

  const headlineDesktop =
    remaining > 0
      ? `Faltam-te ${remaining} ${remaining === 1 ? "secção premium" : "secções premium"}`
      : "Desbloqueia o relatório completo";
  const headlineMobile =
    remaining > 0
      ? `Faltam ${remaining} ${remaining === 1 ? "secção" : "secções"}`
      : "Relatório completo";

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
      role="region"
      aria-label="Desbloquear relatório completo"
    >
      {/* Desktop variant */}
      <div
        className={cn(
          "hidden md:block",
          "pointer-events-auto",
          "bg-[#03045E]/95 backdrop-blur-md border-t border-white/10",
          "shadow-[0_-12px_32px_-16px_rgba(3,4,94,0.45)]",
        )}
      >
        <div className="mx-auto max-w-[1520px] px-6 lg:px-8 py-3 flex items-center gap-5">
          <div className="hidden md:flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
            <Lock className="size-4 text-[#90E0EF]" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">
              {headlineDesktop}
            </p>
            {viewed === 0 ? (
              <p className="text-xs text-white/60 truncate">
                frequência, formatos, publicações-chave, diagnóstico e prioridades
              </p>
            ) : (
              <p className="text-xs text-white/60 truncate">
                {viewed} de {total} secções vistas
              </p>
            )}
          </div>
          <ProgressSegments viewed={viewed} total={total} />
          <div className="shrink-0 flex items-baseline gap-1.5">
            <span className="text-base font-semibold tabular-nums text-white">
              {priceLabel}
            </span>
            <span className="text-xs text-white/60">único</span>
          </div>
          <button
            type="button"
            onClick={handleUnlock}
            className={cn(
              "shrink-0 inline-flex items-center rounded-full",
              "bg-[#3772E5] text-white",
              "px-5 py-2 text-sm font-semibold",
              "hover:bg-[#3D9AFF] transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D9AFF]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#03045E]",
            )}
          >
            Desbloquear
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fechar barra"
            className={cn(
              "shrink-0 inline-flex items-center justify-center",
              "size-8 rounded-full text-white/60",
              "hover:bg-white/10 hover:text-white transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
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
          "mx-3 mb-[72px] rounded-2xl",
          "bg-[#03045E]/95 backdrop-blur-md border border-white/10",
          "shadow-[0_12px_32px_-12px_rgba(3,4,94,0.55)]",
        )}
      >
        <div className="relative px-3.5 pt-3 pb-3">
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fechar barra"
            className="absolute top-1.5 right-1.5 inline-flex items-center justify-center size-7 rounded-full text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-3 pr-7">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
              <Lock className="size-3.5 text-[#90E0EF]" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">
                {headlineMobile}
              </p>
              <p className="text-[11px] text-white/60 truncate">
                {priceLabel} · pagamento único
              </p>
            </div>
            <ProgressSegments viewed={viewed} total={total} compact />
          </div>
          <button
            type="button"
            onClick={handleUnlock}
            className={cn(
              "mt-3 w-full inline-flex items-center justify-center rounded-full",
              "bg-[#3772E5] text-white",
              "px-4 py-2.5 text-sm font-semibold",
              "hover:bg-[#3D9AFF] transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D9AFF]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#03045E]",
            )}
          >
            Desbloquear relatório completo
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressSegments({
  viewed,
  total,
  compact = false,
}: {
  viewed: number;
  total: number;
  compact?: boolean;
}) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={viewed}
      aria-label="Secções premium vistas"
      className={cn(
        "shrink-0 flex items-center",
        compact ? "gap-1" : "gap-1.5",
      )}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            "block rounded-full transition-colors",
            compact ? "h-[3px] w-3.5" : "h-[3px] w-6",
            i < viewed ? "bg-[#22C55E]" : "bg-white/15",
          )}
        />
      ))}
    </div>
  );
}