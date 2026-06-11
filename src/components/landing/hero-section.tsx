import { useTranslation } from "react-i18next";

import { Container } from "@/components/layout/container";
import { BlurRevealText } from "@/components/landing/blur-reveal-text";
import { HeroActionBar } from "@/components/landing/hero-action-bar";
import { HeroAuroraBackground } from "@/components/landing/hero-aurora-background";
import { HeroReportPreview } from "@/components/landing/hero-report-preview";
import { ScrollIndicator } from "@/components/landing/scroll-indicator";
import { TiltCard } from "@/components/landing/tilt-card";
import instagramLogoAsset from "@/assets/instagram-logo.png.asset.json";

export function HeroSection() {
  const { t } = useTranslation("landing");
  return (
    <section
      id="hero"
      className="hero-dark hero-cinematic-vignette relative w-full overflow-hidden flex items-center lg:min-h-[calc(100dvh-4rem)]"
      aria-label={t("hero.headline")}
    >
      <HeroAuroraBackground />

      <Container size="lg" className="relative z-10 py-16 md:py-28 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-12 items-center">
          {/* Left — copy + action */}
          <div className="order-1 space-y-7 md:space-y-8 text-center lg:text-left">
            <BlurRevealText
              text={t("hero.headline")}
              as="h1"
              className="font-display text-[2.5rem] sm:text-5xl md:text-6xl lg:text-7xl tracking-[-0.02em] font-medium leading-[1.05] sm:leading-[1.02] text-balance max-w-[16ch] sm:max-w-[20ch] lg:max-w-[22ch] mx-auto lg:mx-0 text-[color:rgb(var(--hero-text-primary))]"
              delayMs={150}
              highlightTailWords={2}
              highlightClassName="bg-gradient-to-r from-[rgb(var(--hero-cyan-soft))] via-[rgb(var(--hero-cyan))] to-[rgb(var(--hero-violet))] bg-clip-text text-transparent"
            />

            <BlurRevealText
              text={t("hero.subtitle")}
              as="p"
              className="font-sans text-[1.125rem] md:text-xl leading-[1.6] max-w-xl mx-auto lg:mx-0 text-[color:rgb(var(--hero-text-secondary))]"
              delayMs={500}
            />

            <div className="pt-4 lg:pt-2">
              <HeroActionBar />
            </div>
          </div>

          {/* Right — report preview */}
          <div className="order-2 lg:order-2 w-full mt-10 sm:mt-12 lg:mt-0">
            <TiltCard
              className="rounded-3xl"
              tiltLimit={8}
              scale={1.02}
              perspective={1400}
              effect="gravitate"
              spotlight
            >
              {/* Foggy Instagram brand mark, peeking from the top-right corner */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-12 -right-12 w-[340px] h-[340px] z-0"
                style={{
                  backgroundImage: `url(${instagramLogoAsset.url})`,
                  backgroundSize: "contain",
                  backgroundRepeat: "no-repeat",
                  opacity: 0.12,
                  filter: "blur(2px) saturate(1.15)",
                  mixBlendMode: "screen",
                  WebkitMaskImage:
                    "radial-gradient(circle at top right, black 40%, transparent 75%)",
                  maskImage:
                    "radial-gradient(circle at top right, black 40%, transparent 75%)",
                  transform: "translateZ(-40px)",
                }}
              />
              <div className="relative z-10">
                <HeroReportPreview />
              </div>
            </TiltCard>
          </div>
        </div>
      </Container>

      <ScrollIndicator />
    </section>
  );
}
