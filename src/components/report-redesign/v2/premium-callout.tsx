import type { ReactNode } from "react";
import { Crown, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Title of the premium feature. */
  title: string;
  /** Short description. */
  description: string;
  /** Optional slot for CTA button or extra content. */
  children?: ReactNode;
  className?: string;
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
}: Props) {
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
      </div>
    </div>
  );
}