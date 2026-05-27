import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

interface Props {
  onClick: () => void;
}

/**
 * Mobile-only sticky bar that surfaces the unlock CTA when the report
 * is gated. Sits above the bottom tabs bar (which is fixed bottom-0).
 */
export function StickyUnlockBar({ onClick }: Props) {
  const { t } = useTranslation("report");
  return (
    <div
      className={cn(
        "lg:hidden fixed left-0 right-0 z-30",
        "bottom-[64px]",
        "px-3 pb-2 pt-2",
        "pointer-events-none",
      )}
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto flex items-center gap-3 rounded-xl",
          "bg-content-primary text-white shadow-lg",
          "px-3 py-2.5",
        )}
      >
        <Lock className="size-4 shrink-0 text-amber-300" aria-hidden="true" />
        <p className="min-w-0 flex-1 truncate text-xs font-medium">
          {t("sticky_unlock.body", {
            defaultValue: "5 secções premium por desbloquear",
          })}
        </p>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            "shrink-0 rounded-lg bg-white px-3 py-1.5",
            "text-[11px] font-bold uppercase tracking-[0.08em] text-content-primary",
            "hover:bg-white/90 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-content-primary",
          )}
          aria-label={t("sticky_unlock.cta_aria", {
            defaultValue: "Abrir opções de desbloqueio",
          })}
        >
          {t("sticky_unlock.cta", { defaultValue: "Desbloquear" })}
        </button>
      </div>
    </div>
  );
}