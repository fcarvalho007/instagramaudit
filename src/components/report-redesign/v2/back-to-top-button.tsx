import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

/**
 * Floating "back to top" button. Appears after the user scrolls past
 * ~800px. Positioned above the mobile bottom nav (which has h-20) and
 * regular bottom inset on desktop.
 */
export function BackToTopButton() {
  const { t } = useTranslation("report");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => setVisible(window.scrollY > 800);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={t("a11y.back_to_top", { defaultValue: "Voltar ao topo" })}
      className={cn(
        "fixed right-4 z-30 inline-flex items-center justify-center",
        "bottom-24 lg:bottom-6",
        "size-11 rounded-full bg-content-primary text-white shadow-lg",
        "transition-opacity duration-200",
        "hover:bg-content-primary/90",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base",
        visible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
    >
      <ArrowUp className="size-5" aria-hidden="true" />
    </button>
  );
}