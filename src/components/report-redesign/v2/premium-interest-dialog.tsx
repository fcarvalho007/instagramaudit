import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/tracking.functions";
import { cn } from "@/lib/utils";

// NOTE: Real checkout endpoint is not yet wired. CTAs only emit a typed
// `pricing_option_clicked` event so we can measure intent without faking a
// payment flow. Wire to real checkout when the payment integration lands.
export type PricingOption = "single_report" | "pack_5_reports";

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
  const { t } = useTranslation("report");
  const [selected, setSelected] = useState<PricingOption | null>(null);

  const handleSelect = (option: PricingOption) => {
    setSelected(option);
    // Checkout not yet implemented — only emit intent for analytics.
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
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg font-semibold text-content-primary">
            {t("premium.dialog.title")}
          </DialogTitle>
          <DialogDescription className="text-sm text-content-secondary leading-relaxed">
            {t("premium.dialog.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-2">
          <PricingCard
            id="single_report"
            title={t("premium.dialog.single.title")}
            price={t("premium.dialog.single.price")}
            bullets={[
              t("premium.dialog.single.bullet_profile"),
              t("premium.dialog.single.bullet_unlock"),
            ]}
            note={t("premium.dialog.single.note")}
            cta={t("premium.dialog.single.cta")}
            selected={selected === "single_report"}
            onSelect={handleSelect}
          />
          <PricingCard
            id="pack_5_reports"
            title={t("premium.dialog.pack.title")}
            price={t("premium.dialog.pack.price")}
            bullets={[
              t("premium.dialog.pack.bullet_reports"),
              t("premium.dialog.pack.bullet_unit"),
            ]}
            cta={t("premium.dialog.pack.cta")}
            badge={t("premium.dialog.pack.savings_badge")}
            recommended
            selected={selected === "pack_5_reports"}
            onSelect={handleSelect}
          />
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-xs text-content-tertiary">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          {t("premium.dialog.trust_note")}
        </p>
      </DialogContent>
    </Dialog>
  );
}

interface PricingCardProps {
  id: PricingOption;
  title: string;
  price: string;
  bullets: string[];
  note?: string;
  cta: string;
  badge?: string;
  recommended?: boolean;
  selected: boolean;
  onSelect: (id: PricingOption) => void;
}

function PricingCard({
  id,
  title,
  price,
  bullets,
  note,
  cta,
  badge,
  recommended = false,
  selected,
  onSelect,
}: PricingCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border bg-surface-base p-4 sm:p-5",
        "border-border-default transition-colors",
        recommended && "ring-1 ring-accent-secondary/30",
        selected && "border-accent-primary/50",
      )}
    >
      {badge ? (
        <span
          className={cn(
            "absolute -top-2 right-4 inline-flex items-center rounded-full",
            "px-2 py-0.5 text-eyebrow-sm",
            "bg-accent-secondary/10 text-accent-secondary ring-1 ring-accent-secondary/20",
          )}
        >
          {badge}
        </span>
      ) : null}

      <p className="text-sm font-semibold text-content-primary">{title}</p>
      <p className="mt-1 text-2xl font-bold text-content-primary tabular-nums">
        {price}
      </p>

      <ul className="mt-3 space-y-1.5">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-2 text-xs text-content-secondary"
          >
            <Check
              aria-hidden="true"
              className="mt-0.5 size-3.5 shrink-0 text-accent-primary"
            />
            <span className="tabular-nums">{b}</span>
          </li>
        ))}
      </ul>

      {note ? (
        <p className="mt-3 text-xs text-content-tertiary leading-relaxed">
          {note}
        </p>
      ) : null}

      <div className="mt-4 sm:mt-auto pt-2">
        <Button
          type="button"
          onClick={() => onSelect(id)}
          variant={recommended ? "primary" : "outline"}
          className="w-full"
          aria-pressed={selected}
        >
          {cta}
        </Button>
      </div>
    </div>
  );
}