import { MessagesSquare, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { trackAnonymousEvent } from "@/lib/analytics/anonymous-funnel";

const DISMISS_KEY = "sticky_free_cta:dismissed";

/**
 * Sticky discreta do Estado A (Auditoria Instantânea).
 *
 * Mostra exactamente a mesma acção do `DeepenAnalysisCta` — "Aprofundar
 * gratuitamente" — sem preço, sem contador de secções e sem competir com
 * o CTA principal: desaparece assim que o bloco `#deepen-analysis` entra
 * no ecrã. Nunca é montada nos estados B/C.
 */
export function StickyFreeCtaBar({
  handle,
  snapshotId,
  onConvert,
}: {
  handle: string;
  snapshotId: string;
  onConvert: () => void;
}) {
  const { t } = useTranslation("conversion");
  const [scrolled, setScrolled] = useState(false);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (window.sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch {
      /* private mode — ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setScrolled(window.scrollY > 700);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      return;
    }
    let observer: IntersectionObserver | undefined;
    let attempts = 0;
    const wire = () => {
      const node = document.getElementById("deepen-analysis");
      if (node) {
        observer = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (entry) setCtaVisible(entry.isIntersecting);
          },
          { rootMargin: "0px 0px -80px 0px", threshold: 0 },
        );
        observer.observe(node);
        return;
      }
      if (attempts < 20) {
        attempts += 1;
        window.setTimeout(wire, 250);
      }
    };
    wire();
    return () => observer?.disconnect();
  }, []);

  const visible = scrolled && !ctaVisible && !dismissed;

  useEffect(() => {
    if (!visible) return;
    trackAnonymousEvent("deepen_cta_viewed", {
      handle,
      snapshotId,
      metadata: { conversion_entry_point: "comment_intelligence", surface: "sticky" },
      dedupeKey: `${snapshotId}:deepen_sticky_viewed`,
    });
  }, [visible, handle, snapshotId]);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      aria-hidden={!visible}
      role="region"
      aria-label={t("deepen.title")}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 pointer-events-none",
        "transition-[opacity,transform] duration-200 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
      )}
    >
      <div
        className={cn(
          "pointer-events-auto mx-3 mb-[72px] rounded-2xl md:mx-auto md:mb-4 md:max-w-3xl",
          "border border-border-default bg-surface-secondary shadow-lg",
          !visible && "pointer-events-none",
        )}
      >
        <div className="relative flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-5">
          <MessagesSquare
            className="size-5 shrink-0 text-accent-primary"
            aria-hidden="true"
          />
          <p className="min-w-0 flex-1 pr-6 text-sm text-content-secondary">
            {t("subcopy")}
          </p>
          <button
            type="button"
            onClick={() => {
              trackAnonymousEvent("deepen_cta_clicked", {
                handle,
                snapshotId,
                metadata: {
                  conversion_entry_point: "comment_intelligence",
                  surface: "sticky",
                },
              });
              onConvert();
            }}
            className="shrink-0 rounded-lg bg-accent-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-primary/90"
          >
            {t("cta.comment_intelligence")}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Fechar barra"
            className="absolute right-1.5 top-1.5 inline-flex size-7 items-center justify-center rounded-full text-content-tertiary transition hover:bg-surface-muted sm:static sm:size-8"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
