import { useTranslation } from "react-i18next";

import { Container } from "@/components/layout/container";
import { BlurRevealText } from "@/components/landing/blur-reveal-text";
import { HeroActionBar } from "@/components/landing/hero-action-bar";
import { HeroAuroraBackground } from "@/components/landing/hero-aurora-background";
import { HeroReportPreview } from "@/components/landing/hero-report-preview";
import { ScrollIndicator } from "@/components/landing/scroll-indicator";

export function HeroSection() {
  const { t } = useTranslation("landing");
  return (
    <section
      className="hero-light relative w-full overflow-hidden flex items-center lg:min-h-[calc(100dvh-4rem)]"
      aria-label={t("hero.headline")}
    >
      <HeroAuroraBackground />

      <Container size="lg" className="relative z-10 py-10 md:py-24 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-12 items-center">
          {/* Left — copy + action */}
          <div className="space-y-5 md:space-y-7 text-center lg:text-left">
            {/* Eyebrow */}
            <div className="flex justify-center lg:justify-start">
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-eyebrow-sm text-accent-primary"
                style={{
                  borderColor: "rgb(var(--accent-primary) / 0.18)",
                  backgroundColor: "rgb(var(--accent-primary) / 0.08)",
                }}
              >
                <span className="size-1.5 rounded-full bg-accent-primary" />
                {t("hero.eyebrow")}
              </span>
            </div>

            <BlurRevealText
              text={t("hero.headline")}
              as="h1"
              className="font-display text-[1.75rem] sm:text-4xl md:text-5xl lg:text-6xl tracking-tight font-medium leading-[1.12] sm:leading-[1.08] text-balance max-w-[18ch] sm:max-w-[20ch] lg:max-w-[22ch] mx-auto lg:mx-0 text-content-primary"
              delayMs={150}
              highlightTailWords={2}
              highlightClassName="text-accent-primary"
            />

            <BlurRevealText
              text={t("hero.subtitle")}
              as="p"
              className="font-sans text-base md:text-lg leading-relaxed max-w-xl mx-auto lg:mx-0 text-content-secondary"
              delayMs={500}
            />

            <div className="pt-4 lg:pt-2">
              <HeroActionBar />
            </div>
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
