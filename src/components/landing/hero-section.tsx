import { useTranslation } from "react-i18next";

import { Container } from "@/components/layout/container";
import { BlurRevealText } from "@/components/landing/blur-reveal-text";
import { HeroActionBar } from "@/components/landing/hero-action-bar";
import { HeroAuroraBackground } from "@/components/landing/hero-aurora-background";
import { HeroReportPreview } from "@/components/landing/hero-report-preview";
import { ScrollIndicator } from "@/components/landing/scroll-indicator";
import { Check } from "lucide-react";

export function HeroSection() {
  const { t } = useTranslation("landing");
  const trustItems = [
    t("hero.trust.freeReports"),
    t("hero.trust.publicData"),
    t("hero.trust.freeAccount"),
  ];
  return (
    <section
      className="hero-dark relative min-h-[calc(100dvh-4rem)] w-full overflow-hidden flex items-center"
      aria-label={t("hero.headline")}
    >
      <HeroAuroraBackground />

      <Container size="lg" className="relative z-10 py-16 md:py-24 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-12 items-center">
          {/* Left — copy + action */}
          <div className="space-y-6 md:space-y-7 text-center lg:text-left">
            {/* Eyebrow */}
            <div className="flex justify-center lg:justify-start">
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-eyebrow-sm"
                style={{
                  color: "var(--hero-cyan)",
                  borderColor: "var(--hero-cyan-soft)",
                  backgroundColor: "var(--hero-cyan-soft)",
                }}
              >
                <span className="size-1.5 rounded-full bg-[var(--hero-cyan)]" />
                {t("hero.eyebrow")}
              </span>
            </div>

            <BlurRevealText
              text={t("hero.headline")}
              as="h1"
              className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight font-medium leading-[1.05] text-balance"
              delayMs={150}
            />

            <BlurRevealText
              text={t("hero.subtitle")}
              as="p"
              className="font-sans text-base md:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0"
              delayMs={500}
            />

            <div className="pt-4 lg:pt-2">
              <HeroActionBar />
            </div>

            {/* Trust row */}
            <ul
              className="flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 pt-2"
              aria-label="Trust"
            >
              {trustItems.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm"
                  style={{ color: "var(--hero-fg-subtle)" }}
                >
                  <Check
                    className="size-4"
                    style={{ color: "var(--hero-cyan)" }}
                    aria-hidden="true"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right — report preview */}
          <div className="w-full">
            <HeroReportPreview />
          </div>
        </div>
      </Container>

      <ScrollIndicator />
    </section>
  );
}
