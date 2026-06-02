import { useTranslation } from "react-i18next";

import { HeroActionBar } from "@/components/landing/hero-action-bar";
import { Reveal } from "./reveal";

export function FinalCtaBand() {
  const { t } = useTranslation("landing");

  return (
    <section
      aria-labelledby="dark-final-title"
      className="dark-spotlight relative overflow-hidden px-6 py-16 sm:px-10 sm:py-20"
    >
      <Reveal className="relative text-center">
        <h2
          id="dark-final-title"
          className="font-display text-3xl sm:text-[34px] font-medium leading-[1.15] mb-3.5"
          style={{ color: "rgb(var(--hero-text-primary))" }}
        >
          {t("dark.finalCta.headline")}
        </h2>
        <p
          className="text-sm mb-7"
          style={{ color: "rgb(var(--hero-text-secondary))" }}
        >
          {t("dark.finalCta.lead")}
        </p>

        <div className="max-w-xl mx-auto">
          <HeroActionBar />
        </div>
      </Reveal>
    </section>
  );
}