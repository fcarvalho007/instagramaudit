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
import { usePricing } from "@/lib/pricing/use-pricing";
import {
  PricingInterestModal,
  type PricingInterestOption,
} from "@/components/pricing/pricing-interest-modal";
import { ReserveDiagnosisButton } from "@/components/payments/reserve-diagnosis-button";

// NOTE: Real checkout endpoint is not yet wired. CTAs only emit a typed
// `pricing_option_clicked` event so we can measure intent without faking a
// payment flow. Wire to real checkout when the payment integration lands.
export type PricingOption = "free" | "single_report" | "pack_5_reports";

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
  const { plans } = usePricing();
  const [selected, setSelected] = useState<PricingOption | null>(null);
  const [interestOption, setInterestOption] =
    useState<PricingInterestOption | null>(null);
  const [interestOpen, setInterestOpen] = useState(false);

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
    if (option === "free") {
      onOpenChange(false);
      return;
    }
    // Para planos pagos abre o modal de recolha de interesse.
    // Fecha primeiro o dialog actual para evitar focus-trap duplo do Radix,
    // e abre o PricingInterestModal após a animação de saída.
    setInterestOption(option);
    onOpenChange(false);
    setTimeout(() => setInterestOpen(true), 200);
  };

  const interestMeta: Record<PricingInterestOption, { label: string; price: string }> = {
    single_report: {
      label: plans.single_report.label,
      price: plans.single_report.priceFormatted,
    },
    pack_5_reports: {
      label: plans.pack_5_reports.label,
      price: plans.pack_5_reports.priceFormatted,
    },
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader className="text-left">
          <span className="text-eyebrow-sm text-accent-primary">
            {t("premium.dialog.eyebrow", "Opções de acesso")}
          </span>
          <DialogTitle className="text-lg font-semibold text-content-primary">
            {t("premium.dialog.title")}
          </DialogTitle>
          <DialogDescription className="text-sm text-content-secondary leading-relaxed">
            {t("premium.dialog.subtitle")}
          </DialogDescription>
        </DialogHeader>

        <div
          className={cn(
            "mt-4 rounded-xl border border-accent-primary/30 bg-accent-primary/[0.04]",
            "px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="text-eyebrow-sm text-accent-primary">
              Beta · oferta limitada
            </p>
            <p className="mt-1 text-sm font-semibold text-content-primary">
              Diagnóstico de Autoridade Digital — 97€{" "}
              <span className="text-content-tertiary line-through font-normal">149€</span>
            </p>
            <p className="mt-1 text-xs text-content-secondary leading-relaxed">
              Relatório completo + sessão humana de 30 min + 3 prioridades de
              melhoria + follow-up por email.
            </p>
          </div>
          <ReserveDiagnosisButton
            productCode="authority_diagnosis_97"
            sourceComponent={sourceComponent}
            instagramUsername={handle ?? undefined}
            returnPath="/"
            className="shrink-0"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 items-stretch">
          <PricingCard
            id="free"
            tone="free"
            label={t("premium.dialog.free.label")}
            title={t("premium.dialog.free.title")}
            bullets={[
              t("premium.dialog.free.bullet_block"),
              t("premium.dialog.free.bullet_diag"),
            ]}
            cta={t("premium.dialog.free.cta")}
            selected={selected === "free"}
            onSelect={handleSelect}
          />
          <PricingCard
            id="single_report"
            tone="premium"
            label={t("premium.dialog.single.label")}
            title={t("premium.dialog.single.title")}
            price={t("premium.dialog.single.price")}
            launchPriceLabel={t("premium.dialog.single.launch_price")}
            bullets={[t("premium.dialog.single.bullet_combined")]}
            note={t("premium.dialog.single.note")}
            cta={t("premium.dialog.single.cta")}
            selected={selected === "single_report"}
            onSelect={handleSelect}
          />
          <PricingCard
            id="pack_5_reports"
            tone="best-value"
            label={t("premium.dialog.pack.label")}
            title={t("premium.dialog.pack.title")}
            price={t("premium.dialog.pack.price")}
            unit={t("premium.dialog.pack.bullet_unit")}
            bullets={[t("premium.dialog.pack.bullet_reports")]}
            cta={t("premium.dialog.pack.cta")}
            badge={t("premium.dialog.pack.savings_badge")}
            selected={selected === "pack_5_reports"}
            onSelect={handleSelect}
          />
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-xs text-content-tertiary">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          {t("premium.dialog.trust_note")}
        </p>
        <p className="mt-1 text-xs text-content-tertiary leading-relaxed">
          {t("premium.dialog.pending_note")}
        </p>
      </DialogContent>
    </Dialog>
    <PricingInterestModal
      open={interestOpen}
      onOpenChange={setInterestOpen}
      option={interestOption}
      planLabel={interestOption ? interestMeta[interestOption].label : ""}
      planPrice={interestOption ? interestMeta[interestOption].price : ""}
    />
    </>
  );
}

type PricingTone = "free" | "premium" | "best-value";

interface PricingCardProps {
  id: PricingOption;
  tone: PricingTone;
  label: string;
  title: string;
  price?: string;
  unit?: string;
  launchPriceLabel?: string;
  bullets: string[];
  note?: string;
  cta: string;
  badge?: string;
  selected: boolean;
  onSelect: (id: PricingOption) => void;
}

function PricingCard({
  id,
  tone,
  label,
  title,
  price,
  unit,
  launchPriceLabel,
  bullets,
  note,
  cta,
  badge,
  selected,
  onSelect,
}: PricingCardProps) {
  const isBest = tone === "best-value";
  const isFree = tone === "free";

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden rounded-xl border p-5 backdrop-blur-sm transition-colors",
        isFree
          ? "bg-surface-muted/70 border-border-default"
          : "bg-white border-border-default shadow-[0_18px_48px_-32px_rgba(15,23,42,0.18)] hover:border-accent-primary/40",
        isBest &&
          "ring-1 ring-accent-primary/25 shadow-[0_24px_60px_-30px_rgba(55,114,229,0.35)]",
        selected && "ring-2 ring-accent-primary/40",
      )}
    >
      {isBest ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-accent-primary/[0.05] via-transparent to-accent-secondary/[0.05]"
        />
      ) : null}
      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 top-0 h-px",
          isFree
            ? "bg-gradient-to-r from-transparent via-border-default to-transparent"
            : isBest
              ? "bg-gradient-to-r from-transparent via-accent-primary/70 to-transparent"
              : "bg-gradient-to-r from-transparent via-accent-primary/40 to-transparent",
        )}
      />
      {badge ? (
        <span
          className={cn(
            "absolute right-3 top-3 inline-flex items-center rounded-full",
            "px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide leading-none",
            "bg-accent-secondary/10 text-accent-secondary ring-1 ring-accent-secondary/20",
          )}
        >
          {badge}
        </span>
      ) : null}

      <span
        className={cn(
          "inline-flex w-fit max-w-[60%] items-center rounded-full px-2 py-0.5 text-eyebrow-sm",
          isFree && "bg-surface-base text-content-tertiary ring-1 ring-border-default",
          tone === "premium" &&
            "bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/20",
          isBest &&
            "bg-accent-secondary/10 text-accent-secondary ring-1 ring-accent-secondary/20",
        )}
      >
        {label}
      </span>

      <p className="mt-3 text-sm font-semibold text-content-primary">{title}</p>
      <p className="mt-1 text-3xl font-bold text-content-primary tabular-nums leading-none">
        {price ?? "0€"}
      </p>
      {unit ? (
        <p className="text-xs text-content-tertiary tabular-nums">{unit}</p>
      ) : null}
      {launchPriceLabel ? (
        <p className="mt-0.5 text-xs text-content-tertiary">{launchPriceLabel}</p>
      ) : null}

      <ul className="mt-3 space-y-1.5">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-2 text-xs text-content-secondary"
          >
            <Check
              aria-hidden="true"
              className={cn(
                "mt-0.5 size-3.5 shrink-0",
                isFree ? "text-content-tertiary" : "text-accent-primary",
              )}
            />
            <span>{b}</span>
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
          variant={isBest ? "primary" : "outline"}
          className="w-full"
          aria-pressed={selected}
        >
          {cta}
        </Button>
      </div>
    </div>
  );
}