import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/tracking.functions";
import { cn } from "@/lib/utils";

// Checkout is not yet wired. CTAs only emit a typed `pricing_option_clicked`
// event so we can measure intent without faking a payment flow.
type PricingOption = "single_report" | "pack_5_reports";

export function PricingPage() {
  const { t } = useTranslation("pricing");
  const [selected, setSelected] = useState<PricingOption | null>(null);

  const handleSelect = (option: PricingOption) => {
    setSelected(option);
    trackEvent({
      data: {
        eventType: "pricing_option_clicked",
        metadata: {
          pricing_option: option,
          source_component: "pricing_page",
        },
      },
    }).catch(() => {});
  };

  const accessItems = t("access.items", { returnObjects: true }) as string[];

  return (
    <main className="min-h-screen bg-surface-base">
      <section className="mx-auto max-w-3xl px-4 pt-16 pb-10 sm:pt-24 sm:pb-12 text-center">
        <h1 className="font-fraunces text-4xl sm:text-5xl font-medium tracking-tight text-content-primary">
          {t("hero.title")}
        </h1>
        <p className="mt-4 text-base sm:text-lg text-content-secondary leading-relaxed">
          {t("hero.subtitle")}
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PricingCard
            id="single_report"
            title={t("single.title")}
            price={t("single.price")}
            bullets={[t("single.bullet_profile"), t("single.bullet_unlock")]}
            note={t("single.note")}
            cta={t("single.cta")}
            selected={selected === "single_report"}
            onSelect={handleSelect}
          />
          <PricingCard
            id="pack_5_reports"
            title={t("pack.title")}
            price={t("pack.price")}
            bullets={[t("pack.bullet_reports"), t("pack.bullet_unit")]}
            cta={t("pack.cta")}
            badge={t("pack.savings_badge")}
            recommended
            selected={selected === "pack_5_reports"}
            onSelect={handleSelect}
          />
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-content-tertiary">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          {t("trust_note")}
        </p>
        <p className="mt-2 text-center text-xs text-content-tertiary leading-relaxed">
          {t("pending_note")}
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-24">
        <div className="rounded-2xl bg-surface-muted border border-border-default px-6 py-8 sm:px-10 sm:py-10">
          <h2 className="font-fraunces text-2xl sm:text-3xl font-medium tracking-tight text-content-primary">
            {t("access.title")}
          </h2>
          <ol className="mt-5 space-y-3">
            {accessItems.map((item, idx) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm sm:text-base text-content-secondary leading-relaxed"
              >
                <span
                  aria-hidden="true"
                  className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-primary/10 text-xs font-semibold text-accent-primary tabular-nums"
                >
                  {idx + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
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
        "relative flex flex-col rounded-xl border bg-surface-base p-5 sm:p-6",
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
      <p className="mt-1 text-3xl font-bold text-content-primary tabular-nums">
        {price}
      </p>

      <ul className="mt-4 space-y-2">
        {bullets.map((b) => (
          <li
            key={b}
            className="flex items-start gap-2 text-sm text-content-secondary"
          >
            <Check
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-accent-primary"
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

      <div className="mt-5 sm:mt-auto pt-2">
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