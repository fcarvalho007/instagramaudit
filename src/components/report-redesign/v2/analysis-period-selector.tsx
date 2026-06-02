import { Check, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePremiumCta } from "./premium-cta-context";

interface AnalysisPeriodSelectorProps {
  sampleSize: number;
  observedDays: number;
  /** Kept for backwards compat in the props shape — currently unused
   *  because the unified `PremiumCtaProvider` already knows snapshot,
   *  handle and variant. Safe to drop in a follow-up. */
  snapshotId?: string | null;
  handle?: string | null;
  variant?: string;
  className?: string;
}

const PREMIUM_WINDOWS = [30, 60, 90, 365] as const;

/**
 * Read-only "Analysis period" selector mounted between the hero and the
 * blocks. The active state is always the free sample ("Latest N posts").
 * Premium windows are visible but locked — clicking opens a popover that
 * routes to the unified premium flow via `PremiumCtaProvider`. The CTA
 * inside the popover opens the same `PremiumInterestDialog` used by the
 * sidebar — never the lead-capture UnlockModal.
 *
 * IMPORTANT: this component is purely presentational. It MUST NOT mutate
 * report data, navigate, change query params, refresh snapshots or call
 * any backend.
 */
export function AnalysisPeriodSelector({
  sampleSize,
  observedDays,
  className,
}: AnalysisPeriodSelectorProps) {
  const { t } = useTranslation("report");
  const { handlePremiumAccessClick, trackPremiumWindowInterest } =
    usePremiumCta();

  const observedBadge =
    observedDays > 0
      ? t(
          observedDays === 1
            ? "selector.observed_badge_one"
            : "selector.observed_badge",
          { days: observedDays },
        )
      : null;

  const handleCta = (days: number) => {
    handlePremiumAccessClick("analysis_period_selector", {
      selected_window: `${days}d`,
    });
  };

  return (
    <section
      aria-label={t("selector.eyebrow")}
      className={cn(
        "w-full lg:w-auto shrink-0 flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-1.5 sm:py-2",
        "border-t border-border-default lg:border-t-0 lg:border-l",
        className,
      )}
    >
      <div className="hidden sm:flex flex-col shrink-0 leading-tight">
        <span className="text-eyebrow-sm text-content-secondary">
          {t("selector.eyebrow")}
        </span>
        {observedBadge ? (
          <span className="text-[11px] text-content-tertiary mt-0.5">
            {observedBadge}
          </span>
        ) : null}
      </div>
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 flex-1 lg:flex-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1",
            "bg-content-primary text-white text-[11px] sm:text-xs font-semibold",
            "shadow-[0_1px_2px_rgba(15,23,42,0.18)]",
          )}
          aria-current="true"
        >
          <Check className="size-3" strokeWidth={3} aria-hidden="true" />
          {t("selector.active_sample", { count: sampleSize })}
        </span>
        {PREMIUM_WINDOWS.map((days) => {
          const label = t(`selector.premium_${days}` as const);
          const labelCompact = t(`selector.premium_${days}_compact` as const);
          return (
            <Popover
              key={days}
              onOpenChange={(o) => {
                if (o) trackPremiumWindowInterest(days);
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-disabled="true"
                  aria-label={t("selector.locked.aria", { window: label })}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1",
                    "border border-border-default bg-surface-muted",
                    "text-[11px] sm:text-xs font-medium text-content-tertiary",
                    "transition-colors duration-150",
                    "hover:bg-surface-base hover:border-border-strong hover:text-content-secondary",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40",
                  )}
                >
                  <span className="sm:hidden">{labelCompact}</span>
                  <span className="hidden sm:inline">{label}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-4" role="dialog">
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 inline-flex size-7 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary"
                  >
                    <Lock className="size-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-content-primary">
                      {t("selector.locked.title")}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-content-secondary">
                      {t("selector.locked.body")}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCta(days)}
                    className={cn(
                      "inline-flex w-full items-center justify-center rounded-lg h-9 px-4",
                      "bg-accent-primary text-white text-sm font-semibold",
                      "transition-colors duration-150 hover:brightness-110",
                    )}
                  >
                    {t("selector.locked.cta")}
                  </button>
                  <p className="text-center text-xs leading-relaxed text-content-tertiary">
                    {t("selector.locked.secondary")}
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </section>
  );
}