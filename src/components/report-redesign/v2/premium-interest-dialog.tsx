import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trackEvent } from "@/lib/tracking.functions";
import { cn } from "@/lib/utils";

export type PricingOption =
  | "single_3_eur"
  | "bundle_13_eur"
  | "monthly"
  | "agency";

interface OptionDef {
  id: PricingOption;
  title: string;
  price: string;
  description: string;
  badge?: string;
}

const OPTIONS: readonly OptionDef[] = [
  {
    id: "single_3_eur",
    title: "premium.dialog.single_title",
    price: "premium.dialog.single_price",
    description: "premium.dialog.single_description",
  },
  {
    id: "bundle_13_eur",
    title: "premium.dialog.bundle_title",
    price: "premium.dialog.bundle_price",
    description: "premium.dialog.bundle_description",
  },
  {
    id: "monthly",
    title: "premium.dialog.monthly_title",
    price: "premium.dialog.monthly_price",
    description: "premium.dialog.monthly_description",
    badge: "premium.dialog.monthly_badge",
  },
  {
    id: "agency",
    title: "premium.dialog.agency_title",
    price: "premium.dialog.agency_price",
    description: "premium.dialog.agency_description",
    badge: "premium.dialog.agency_badge",
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshotId: string | null;
  handle: string | null;
  variant: string;
  sourceComponent: string;
}

export function PremiumInterestDialog({
  open,
  onOpenChange,
  snapshotId,
  handle,
  variant,
  sourceComponent,
}: Props) {
  const [registered, setRegistered] = useState<Set<PricingOption>>(new Set());
  const { t } = useTranslation("report");

  const handleSelect = (option: PricingOption) => {
    if (registered.has(option)) return;
    setRegistered((prev) => {
      const next = new Set(prev);
      next.add(option);
      return next;
    });
    trackEvent({
      data: {
        eventType: "pricing_option_clicked",
        snapshotId: snapshotId ?? undefined,
        handle: handle ?? undefined,
        metadata: {
          pricing_option: option,
          variant,
          source_component: sourceComponent,
        },
      },
    }).catch(() => {});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {t("premium.dialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("premium.dialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-1">
          {OPTIONS.map((opt) => {
            const done = registered.has(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt.id)}
                aria-pressed={done}
                className={cn(
                  "text-left rounded-xl border p-3 transition-colors",
                  "border-border-default bg-surface-base",
                  "hover:border-accent-primary/40 hover:bg-surface-muted",
                  done && "border-accent-primary/60 bg-accent-primary/[0.04]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-content-primary">
                      {t(opt.title)}
                    </p>
                    <p className="text-xs text-content-secondary mt-0.5 tabular-nums">
                      {t(opt.price)}
                    </p>
                  </div>
                  {done ? (
                    <span
                      className="inline-flex items-center gap-1 text-eyebrow-sm text-accent-primary shrink-0"
                      aria-label={t("premium.interest_registered_aria")}
                    >
                      <Check className="size-3" aria-hidden="true" />
                      {t("premium.registered")}
                    </span>
                  ) : opt.badge ? (
                    <span className="text-eyebrow-sm text-content-tertiary shrink-0">
                      {t(opt.badge)}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-content-tertiary mt-2 leading-relaxed">
                  {t(opt.description)}
                </p>
              </button>
            );
          })}
        </div>

        <DialogFooter className="mt-2">
          <p className="text-xs text-content-tertiary flex items-center gap-1.5">
            <Sparkles className="size-3" aria-hidden="true" />
            {t("premium.dialog.footer")}
          </p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}