import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/tracking.functions";
import { cn } from "@/lib/utils";
import { usePricing } from "@/lib/pricing/use-pricing";
import {
  PricingInterestModal,
  type PricingInterestOption,
} from "./pricing-interest-modal";

// Checkout is not yet wired. CTAs only emit a typed `pricing_option_clicked`
// event so we can measure intent without faking a payment flow.
type PricingOption = "free" | "single_report" | "pack_5_reports";

interface AccessStep {
  title: string;
  body: string;
}

export function PricingPage() {
  const { t } = useTranslation("pricing");
  const navigate = useNavigate();
  const { plans } = usePricing();
  const [selected, setSelected] = useState<PricingOption | null>(null);
  const [interestOption, setInterestOption] =
    useState<PricingInterestOption | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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
    if (option === "free") {
      navigate({ to: "/" }).catch(() => {});
      return;
    }
    setInterestOption(option);
    setModalOpen(true);
  };

  const accessSteps = t("access.steps", {
    returnObjects: true,
  }) as AccessStep[];
  const freeBullets = t("free.bullets", { returnObjects: true }) as string[];
  const singleBullets = t("single.bullets", { returnObjects: true }) as string[];
  const packBullets = t("pack.bullets", { returnObjects: true }) as string[];

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
    <main className="relative min-h-screen overflow-hidden bg-surface-base">
      {/* Decorative prism shapes — subtle depth, hidden on mobile */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-0 hidden md:block"
      >
        <div className="absolute left-[8%] top-[140px] size-[320px] rounded-full bg-gradient-to-br from-accent-primary/20 via-accent-secondary/10 to-transparent blur-3xl opacity-60" />
        <div className="absolute right-[6%] top-[260px] size-[380px] rounded-full bg-gradient-to-tr from-accent-secondary/20 via-accent-primary/10 to-transparent blur-3xl opacity-50" />
        <div className="absolute left-1/2 top-[520px] size-[260px] -translate-x-1/2 rounded-full bg-gradient-to-b from-accent-primary/10 to-transparent blur-3xl opacity-50" />
      </div>

      <section className="relative mx-auto max-w-3xl px-4 pt-16 pb-10 sm:pt-24 sm:pb-12 text-center">
        <h1 className="font-fraunces text-4xl sm:text-5xl font-medium tracking-tight text-content-primary">
          {t("hero.title")}
        </h1>
        <p className="mt-4 text-base sm:text-lg text-content-secondary leading-relaxed">
          {t("hero.subtitle")}
        </p>
      </section>

      <section className="relative mx-auto max-w-5xl px-4 pb-10">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5 md:items-stretch">
          <PricingCard
            id="free"
            tone="free"
            label={t("free.label")}
            title={t("free.title")}
            priceWord={t("free.price_word")}
            bullets={freeBullets}
            cta={t("free.cta")}
            selected={selected === "free"}
            onSelect={handleSelect}
          />
          <PricingCard
            id="single_report"
            tone="premium"
            label={t("single.label")}
            title={t("single.title")}
            price={t("single.price")}
            bullets={singleBullets}
            cta={t("single.cta")}
            selected={selected === "single_report"}
            onSelect={handleSelect}
          />
          <PricingCard
            id="pack_5_reports"
            tone="best-value"
            label={t("pack.label")}
            title={t("pack.title")}
            price={t("pack.price")}
            unit={t("pack.unit")}
            badge={t("pack.savings_badge")}
            bullets={packBullets}
            cta={t("pack.cta")}
            selected={selected === "pack_5_reports"}
            onSelect={handleSelect}
          />
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-content-tertiary">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          {t("trust_note")}
        </p>
        <p className="mt-2 text-center text-xs text-content-tertiary leading-relaxed">
          {t("pending_note")}
        </p>
      </section>

      <section className="relative mx-auto max-w-5xl px-4 pb-24">
        <h2 className="font-fraunces text-2xl sm:text-3xl font-medium tracking-tight text-content-primary text-center">
          {t("access.title")}
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
          {accessSteps.map((step, idx) => (
            <div
              key={step.title}
              className="relative overflow-hidden rounded-2xl border border-border-default bg-white/80 backdrop-blur-sm p-6 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.18)]"
            >
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-primary/30 to-transparent"
              />
              <span
                aria-hidden="true"
                className="font-fraunces text-3xl text-accent-primary tabular-nums"
              >
                {idx + 1}
              </span>
              <h3 className="mt-2 text-base font-semibold text-content-primary">
                {step.title}
              </h3>
              <p className="mt-1 text-sm text-content-secondary leading-relaxed">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <PricingInterestModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        option={interestOption}
        planLabel={interestOption ? interestMeta[interestOption].label : ""}
        planPrice={interestOption ? interestMeta[interestOption].price : ""}
      />
    </main>
  );
}

type PricingTone = "free" | "premium" | "best-value";

interface PricingCardProps {
  id: PricingOption;
  tone: PricingTone;
  label: string;
  title: string;
  price?: string;
  priceWord?: string;
  unit?: string;
  bullets: string[];
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
  priceWord,
  unit,
  bullets,
  cta,
  badge,
  selected,
  onSelect,
}: PricingCardProps) {
  const isBest = tone === "best-value";
  const isFree = tone === "free";

  return (
    <div className="relative">
      {isBest ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 hidden md:block translate-x-2 translate-y-2 rounded-2xl border border-border-default bg-white/40 opacity-60"
        />
      ) : null}

      <div
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-2xl border p-6 backdrop-blur-sm",
          "transition-shadow",
          isFree
            ? "bg-surface-muted/70 border-border-default"
            : "bg-white/85 border-border-default shadow-[0_24px_60px_-32px_rgba(15,23,42,0.18)]",
          isBest && "md:-translate-y-1 ring-1 ring-accent-secondary/30",
          selected && "ring-2 ring-accent-primary/40",
        )}
      >
        {/* Prism reflection line */}
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-x-0 top-0 h-px",
            isFree
              ? "bg-gradient-to-r from-transparent via-border-default to-transparent"
              : "bg-gradient-to-r from-transparent via-accent-primary/40 to-transparent",
          )}
        />

        {badge ? (
          <span
            className={cn(
              "absolute right-4 top-4 inline-flex items-center rounded-full",
              "px-2 py-0.5 text-eyebrow-sm",
              "bg-accent-secondary/10 text-accent-secondary ring-1 ring-accent-secondary/20",
            )}
          >
            {badge}
          </span>
        ) : null}

        <span
          className={cn(
            "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-eyebrow-sm",
            isFree && "bg-surface-base text-content-tertiary ring-1 ring-border-default",
            tone === "premium" &&
              "bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/20",
            isBest &&
              "bg-accent-secondary/10 text-accent-secondary ring-1 ring-accent-secondary/20",
          )}
        >
          {label}
        </span>

        <h3 className="mt-3 text-base font-semibold text-content-primary">
          {title}
        </h3>

        {price ? (
          <p className="mt-2 text-4xl font-semibold text-content-primary tabular-nums">
            {price}
          </p>
        ) : (
          <p className="mt-2 font-fraunces text-4xl font-medium tracking-tight text-content-primary">
            {priceWord ?? "—"}
          </p>
        )}

        {unit ? (
          <p className="mt-1 text-xs text-content-tertiary tabular-nums">
            {unit}
          </p>
        ) : null}

        <ul className="mt-5 space-y-2.5">
          {bullets.map((b) => (
            <li
              key={b}
              className="flex items-start gap-2 text-sm text-content-secondary"
            >
              <Check
                aria-hidden="true"
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  isFree ? "text-content-tertiary" : "text-accent-primary",
                )}
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 sm:mt-auto pt-2">
          <Button
            type="button"
            onClick={() => onSelect(id)}
            variant={isBest ? "primary" : isFree ? "ghost" : "outline"}
            className="w-full"
            aria-pressed={selected}
          >
            {cta}
          </Button>
        </div>
      </div>
    </div>
  );
}