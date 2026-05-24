import { useState, type ReactNode } from "react";
import { Crown, Lock, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/tracking.functions";
import { PremiumInterestDialog } from "./premium-interest-dialog";
import { useReportTracking } from "./report-tracking-context";

interface Props {
  /** Title of the premium feature. */
  title: string;
  /** Short description. */
  description: string;
  /** Optional slot for CTA button or extra content. */
  children?: ReactNode;
  className?: string;
  /** When true, shows DESBLOQUEAR button + opens interest dialog on click. */
  unlockEnabled?: boolean;
  /** Logical origin of this callout (used for event metadata). */
  sourceComponent?: string;
}

/**
 * Standardized premium/PRO teaser callout for the report.
 *
 * Gold-island rule: no cyan/blue primary accents inside this component.
 * Uses amber palette exclusively.
 */
export function PremiumCallout({
  title,
  description,
  children,
  className,
  unlockEnabled = false,
  sourceComponent = "premium_callout",
}: Props) {
  const { snapshotId, handle, variant } = useReportTracking();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { t } = useTranslation("report");

  const handleUnlock = () => {
    trackEvent({
      data: {
        eventType: "unlock_clicked",
        snapshotId: snapshotId ?? undefined,
        handle: handle ?? undefined,
        metadata: { variant, source_component: sourceComponent },
      },
    }).catch(() => {});
    setDialogOpen(true);
  };

  return (
    <div
      className={cn(
        "rounded-xl ring-1 border-t-2",
        "bg-amber-50/30 ring-amber-200/50 border-t-amber-400/50",
        "px-4 py-3.5 flex items-start gap-3",
        className,
      )}
    >
      <Lock
        aria-hidden="true"
        className="size-4 mt-0.5 shrink-0 text-amber-600/60"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ring-1",
              "text-eyebrow-sm bg-amber-100/60 text-amber-700 ring-amber-300/50",
            )}
          >
            <Crown aria-hidden="true" className="size-2.5" />
            PRO
          </span>
        </div>
        <p className="text-[13px] text-slate-600 font-medium mt-1.5">
          {title}
        </p>
        <p className="text-[12px] text-slate-500 leading-relaxed mt-0.5">
          {description}
        </p>
        {children ? (
          <div className="mt-2">{children}</div>
        ) : null}
        {unlockEnabled ? (
          <>
            <div className="mt-3">
              <button
                type="button"
                onClick={handleUnlock}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
                  "text-eyebrow-sm bg-amber-600 text-white hover:bg-amber-700",
                  "transition-colors",
                )}
              >
                <Sparkles className="size-3" aria-hidden="true" />
                {t("premium.register_interest")}
              </button>
            </div>
            <PremiumInterestDialog
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              snapshotId={snapshotId}
              handle={handle}
              variant={variant}
              sourceComponent={sourceComponent}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}