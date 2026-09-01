import { ArrowRight, Building2, Check, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "@tanstack/react-router";
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
import { CouponInput } from "@/components/pricing/coupon-input";
import { PUBLIC_PRODUCTS } from "@/lib/payments/products";
import { useState } from "react";

// Both 9€ and 97€ cards now route to focused checkouts.
export type PricingOption = "single_report";

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
  const navigate = useNavigate();
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  // Contextual one-liner shown above the default subtitle, depending on
  // which sidebar action opened the dialog. Falls back to no extra line
  // for sources without dedicated copy (e.g. sidebar_main_cta).
  const contextualKey: Record<string, string | undefined> = {
    sidebar_section: "premium.dialog.contextual.sidebar_section",
    sidebar_period: "premium.dialog.contextual.sidebar_period",
    sidebar_add_competitor: "premium.dialog.contextual.sidebar_add_competitor",
  };
  const contextualLine = contextualKey[sourceComponent]
    ? t(contextualKey[sourceComponent] as string)
    : null;

  const handleSelect = (option: PricingOption) => {
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
    trackEvent({
      data: {
        eventType: "payment_cta_clicked",
        snapshotId: snapshotId ?? undefined,
        handle: handle ?? undefined,
        metadata: {
          product_code: "report_full_9",
          source_component: sourceComponent,
          variant,
        },
      },
    }).catch(() => {});
    onOpenChange(false);
    navigate({
      to: "/checkout/report-full",
      search: {
        source: sourceComponent,
        username: handle ?? undefined,
        return: "/",
        coupon: appliedCoupon ?? undefined,
      },
    }).catch(() => {});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[860px]">
        <DialogHeader className="text-left">
          <span className="text-eyebrow-sm text-accent-primary">
            {t("premium.dialog.eyebrow", "Opções de acesso")}
          </span>
          <DialogTitle className="text-lg font-semibold text-content-primary">
            {t("premium.dialog.title")}
          </DialogTitle>
          {contextualLine ? (
            <p className="text-sm font-medium text-accent-primary leading-relaxed">
              {contextualLine}
            </p>
          ) : null}
          <DialogDescription className="text-sm text-content-secondary leading-relaxed">
            {t("premium.dialog.subtitle")}
          </DialogDescription>
        </DialogHeader>

        {/* Duas propostas apenas: relatório automático (produto
            principal) e leitura humana. A coluna gratuita saiu — quem
            chega aqui já tem tudo o que ela oferecia. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 items-stretch">
          {/* Card 1 — Relatório 9€ */}
          <NeutralCard
            eyebrow={t("premium.dialog.single.label")}
            eyebrowTone="secondary"
            title={t("premium.dialog.single.title")}
            price={PUBLIC_PRODUCTS.report_full_9.priceLabel}
            unit={PUBLIC_PRODUCTS.report_full_9.priceNote}
            bullets={t("premium.dialog.single.bullets", { returnObjects: true }) as string[]}
          >
            <Button
              type="button"
              variant="primary"
              className="w-full gap-2"
              onClick={() => handleSelect("single_report")}
            >
              {t("premium.dialog.single.cta")}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </NeutralCard>

          {/* Card 2 — Hero diagnóstico 97€ */}
          <HeroCard
            badge={t("premium.dialog.hero.badge")}
            eyebrow={t("premium.dialog.hero.label")}
            title={t("premium.dialog.hero.title")}
            price={PUBLIC_PRODUCTS.authority_diagnosis_97.priceLabel}
            strike={t("premium.dialog.hero.strike")}
            launch={t("premium.dialog.hero.launch")}
            bullets={t("premium.dialog.hero.bullets", { returnObjects: true }) as string[]}
          >
            {/* Secundário: só o relatório de 9€ é proposta principal. */}
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                trackEvent({
                  data: {
                    eventType: "payment_cta_clicked",
                    snapshotId: snapshotId ?? undefined,
                    handle: handle ?? undefined,
                    metadata: {
                      product_code: "authority_diagnosis_97",
                      source_component: sourceComponent,
                      variant,
                    },
                  },
                }).catch(() => {});
                onOpenChange(false);
                navigate({
                  to: "/checkout/authority-diagnosis",
                  search: {
                    source: sourceComponent,
                    username: handle ?? undefined,
                    return: "/",
                    coupon: appliedCoupon ?? undefined,
                  },
                }).catch(() => {});
              }}
            >
              Reservar diagnóstico
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </HeroCard>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-t border-border-default pt-4">
          <div className="min-w-0 flex-1">
            <CouponInput
              productCode="authority_diagnosis_97"
              onApplied={setAppliedCoupon}
              appliedCode={appliedCoupon}
            />
          </div>
          <p className="flex items-center gap-1.5 text-xs text-content-tertiary shrink-0">
            <ShieldCheck className="size-3.5" aria-hidden="true" />
            {t("premium.dialog.footer.trust")}
          </p>
        </div>

        <div className="mt-3 rounded-lg bg-surface-muted px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <Building2 className="size-4 text-content-tertiary shrink-0" aria-hidden="true" />
          <p className="text-xs text-content-secondary leading-relaxed flex-1">
            {t("premium.dialog.footer.services_question")}
          </p>
          <Link
            to="/servicos"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent-primary hover:text-accent-primary/80 shrink-0"
          >
            {t("premium.dialog.footer.services_cta")}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type EyebrowTone = "neutral" | "secondary" | "primary";

function Eyebrow({ children, tone }: { children: string; tone: EyebrowTone }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-eyebrow-sm",
        tone === "neutral" && "bg-surface-base text-content-tertiary ring-1 ring-border-default",
        tone === "secondary" &&
          "bg-accent-secondary/10 text-accent-secondary ring-1 ring-accent-secondary/20",
        tone === "primary" &&
          "bg-accent-primary/10 text-accent-primary ring-1 ring-accent-primary/30",
      )}
    >
      {children}
    </span>
  );
}

function BulletList({ items, tone }: { items: string[]; tone: "muted" | "accent" }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {items.map((b) => (
        <li key={b} className="flex items-start gap-2 text-xs text-content-secondary">
          <Check
            aria-hidden="true"
            className={cn(
              "mt-0.5 size-3.5 shrink-0",
              tone === "muted" ? "text-content-tertiary" : "text-accent-primary",
            )}
          />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

interface NeutralCardProps {
  eyebrow: string;
  eyebrowTone: EyebrowTone;
  title: string;
  price: string;
  unit?: string;
  bullets: string[];
  children: React.ReactNode;
}

function NeutralCard({
  eyebrow,
  eyebrowTone,
  title,
  price,
  unit,
  bullets,
  children,
}: NeutralCardProps) {
  return (
    <div className="relative flex h-full flex-col rounded-xl border border-border-default bg-white p-5 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.18)]">
      <Eyebrow tone={eyebrowTone}>{eyebrow}</Eyebrow>
      <p className="mt-3 text-sm font-semibold text-content-primary">{title}</p>
      <p className="mt-1 text-3xl font-bold text-content-primary tabular-nums leading-none">
        {price}
      </p>
      {unit ? <p className="mt-1 text-xs text-content-tertiary leading-relaxed">{unit}</p> : null}
      <BulletList items={bullets} tone={eyebrowTone === "neutral" ? "muted" : "accent"} />
      <div className="mt-4 sm:mt-auto pt-2">{children}</div>
    </div>
  );
}

interface HeroCardProps {
  badge: string;
  eyebrow: string;
  title: string;
  price: string;
  strike: string;
  launch: string;
  bullets: string[];
  children: React.ReactNode;
}

function HeroCard({
  badge,
  eyebrow,
  title,
  price,
  strike,
  launch,
  bullets,
  children,
}: HeroCardProps) {
  return (
    <div className="relative flex h-full flex-col rounded-xl border-2 border-accent-primary/60 bg-accent-primary/[0.05] p-5 shadow-[0_24px_60px_-28px_rgba(55,114,229,0.45)]">
      <span
        className={cn(
          "absolute -top-3 right-4 inline-flex items-center rounded-full",
          "px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide leading-none",
          "bg-accent-primary text-white shadow-sm",
        )}
      >
        {badge}
      </span>
      <Eyebrow tone="primary">{eyebrow}</Eyebrow>
      <p className="mt-3 text-sm font-semibold text-content-primary">{title}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-content-primary tabular-nums leading-none">
          {price}
        </span>
        <span className="text-base text-content-tertiary line-through tabular-nums">{strike}</span>
      </div>
      <p className="mt-1 text-xs text-content-tertiary leading-relaxed">{launch}</p>
      <BulletList items={bullets} tone="accent" />
      <div className="mt-4 sm:mt-auto pt-2">{children}</div>
    </div>
  );
}
