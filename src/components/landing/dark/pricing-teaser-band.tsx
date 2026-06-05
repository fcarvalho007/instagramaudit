import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

function Tier({
  label,
  price,
  strike,
  unit,
  cta,
  featured,
  badge,
}: {
  label: string;
  price: string;
  strike?: string;
  unit: string;
  cta: string;
  featured?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={cn(
        "flex-1 min-w-[170px] rounded-2xl p-6 relative",
        featured ? "dark-card-emphasis" : "dark-card",
      )}
      style={
        featured
          ? {
              borderColor: "rgb(var(--hero-cyan))",
              borderWidth: 2,
            }
          : undefined
      }
    >
      {badge ? (
        <span
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs px-2.5 py-0.5 rounded-full whitespace-nowrap font-semibold"
          style={{ backgroundColor: "rgb(var(--hero-cyan))", color: "#0B1020" }}
        >
          {badge}
        </span>
      ) : null}
      <div
        className="text-sm mb-2.5 font-medium"
        style={{
          color: featured
            ? "rgb(var(--hero-cyan-soft))"
            : "rgb(var(--hero-text-secondary))",
        }}
      >
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className="text-[30px] font-semibold leading-none tabular-nums"
          style={{ color: "rgb(var(--hero-text-primary))" }}
        >
          {price}
        </span>
        {strike ? (
          <span
            className="text-sm line-through tabular-nums"
            style={{ color: "rgb(var(--hero-text-tertiary))" }}
          >
            {strike}
          </span>
        ) : null}
      </div>
      <div
        className="text-xs mt-2 mb-4"
        style={{ color: "rgb(var(--hero-text-secondary))" }}
      >
        {unit}
      </div>
      <Link
        to="/precos"
        className={cn(
          "block w-full text-center text-sm font-semibold py-2.5 rounded-lg transition-colors",
          featured ? "" : "border",
        )}
        style={
          featured
            ? { backgroundColor: "rgb(var(--hero-cyan))", color: "#0B1020" }
            : {
                borderColor: "rgba(var(--hero-cyan), 0.4)",
                color: "rgb(var(--hero-text-primary))",
              }
        }
      >
        {cta}
      </Link>
    </div>
  );
}

export function PricingTeaserBand() {
  const { t } = useTranslation("landing");

  return (
    <section
      aria-labelledby="dark-pricing-title"
      className="dark-hairline border-b px-6 py-14 sm:px-10 sm:py-16"
    >
      <Reveal>
        <div className="text-center mb-9">
          <p className="dark-eyebrow mb-2.5">{t("dark.pricing.eyebrow")}</p>
          <h2
            id="dark-pricing-title"
            className="font-display text-3xl sm:text-4xl font-medium leading-[1.15] mb-2"
            style={{ color: "rgb(var(--hero-text-primary))" }}
          >
            {t("dark.pricing.headline")}
          </h2>
          <p
            className="text-sm"
            style={{ color: "rgb(var(--hero-text-secondary))" }}
          >
            {t("dark.pricing.lead")}{" "}
            <span style={{ color: "rgb(var(--hero-cyan-soft))" }}>
              {t("dark.pricing.urgency")}
            </span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3.5 max-w-2xl mx-auto justify-center">
          <Tier
            label={t("dark.pricing.free.label")}
            price={t("dark.pricing.free.price")}
            unit={t("dark.pricing.free.unit")}
            cta={t("dark.pricing.free.cta")}
          />
          <Tier
            label={t("dark.pricing.single.label")}
            price="9€"
            unit={t("dark.pricing.single.unit")}
            cta={t("dark.pricing.single.cta")}
          />
          <Tier
            label={t("dark.pricing.diagnosis.label")}
            price="97€"
            strike="149€"
            unit={t("dark.pricing.diagnosis.unit")}
            cta={t("dark.pricing.diagnosis.cta")}
            featured
            badge={t("dark.pricing.diagnosis.badge")}
          />
        </div>
      </Reveal>
    </section>
  );
}