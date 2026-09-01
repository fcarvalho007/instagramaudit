import { Lock, X } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";
import { PUBLIC_PRODUCTS } from "@/lib/payments/products";
import { usePremiumCta } from "./premium-cta-context";

const DISMISS_KEY = "sticky_unlock_bar:dismissed";

/**
 * Trigger da barra sticky (auditoria 03A).
 *
 * Acende apenas depois de `#conversas` — a última secção entregue no
 * Estado B. Antes disso o leitor ainda está a receber valor gratuito
 * (visão geral, engagement, cadência, publicações, formatos) e uma
 * proposta comercial seria prematura.
 *
 * Esconde-se enquanto `#lead-magnet-card` (CTA canónico) está em
 * viewport, para nunca competir com a proposta principal.
 */
function useStickyUnlockTrigger() {
  const [passedValue, setPassedValue] = useState(false);
  const [finalCtaVisible, setFinalCtaVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("IntersectionObserver" in window)) return;

    let conversasObserver: IntersectionObserver | undefined;
    let finalObserver: IntersectionObserver | undefined;

    let attempts = 0;
    const wire = () => {
      const conversas = document.getElementById("conversas");
      const finalCta = document.getElementById("lead-magnet-card");

      if (conversas && !conversasObserver) {
        conversasObserver = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            // Só quando a secção já saiu por cima do viewport, i.e. foi
            // efectivamente lida.
            if (entry && !entry.isIntersecting && entry.boundingClientRect.bottom < 0) {
              setPassedValue(true);
            }
          },
          { threshold: 0 },
        );
        conversasObserver.observe(conversas);
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

      if ((!conversas || !finalCta) && attempts < 20) {
        attempts += 1;
        window.setTimeout(wire, 250);
      }
    };
    wire();

    return () => {
      conversasObserver?.disconnect();
      finalObserver?.disconnect();
    };
  }, []);

  return { passedValue, finalCtaVisible };
}

/**
 * Barra sticky de conversão do Estado B. Comunica exactamente a mesma
 * decisão do `ReportEndOfFreeBlock` (uma proposta principal) e leva
 * directamente ao checkout de `report_full_9` — sem modal intermédio,
 * sem contador de secções.
 *
 * Só existe em desktop: em mobile a bottom nav já ocupa a única faixa
 * fixa disponível.
 */
export function StickyUnlockBar() {
  const { goToProCheckout } = usePremiumCta();
  const { passedValue, finalCtaVisible } = useStickyUnlockTrigger();

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
  const visible = passedValue && !finalCtaVisible && !dismissed;

  const handleUnlock = () => goToProCheckout("sticky_unlock_bar");

  return (
    <div
      aria-hidden={!visible}
      className={cn(
        "hidden md:block fixed inset-x-0 bottom-0 z-30",
        "transition-[opacity,transform] duration-200 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none",
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      role="region"
      aria-label="Desbloquear análise Pro"
    >
      <div
        className={cn(
          "pointer-events-auto",
          "bg-[#03045E]/95 backdrop-blur-md border-t border-white/10",
          "shadow-[0_-12px_32px_-16px_rgba(3,4,94,0.45)]",
        )}
      >
        <div className="mx-auto max-w-[1520px] px-6 lg:px-8 py-3 flex items-center gap-5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
            <Lock className="size-4 text-[#90E0EF]" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">
              Diagnóstico e plano de acção
            </p>
            <p className="text-xs text-white/60 truncate">
              As causas dos resultados e as prioridades dos próximos 30 dias
            </p>

          </div>
          <div className="shrink-0 flex items-baseline gap-1.5">
            <span className="text-base font-semibold tabular-nums text-white">{priceLabel}</span>
            <span className="text-xs text-white/60">pagamento único</span>
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
            Desbloquear Pro · {priceLabel}
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
    </div>
  );
}
