import { Container } from "@/components/layout/container";

import { BentoMetricsBand } from "./bento-metrics-band";
import { FinalCtaBand } from "./final-cta-band";
import { HowItWorksBand } from "./how-it-works-band";
import { ManualVsToolBand } from "./manual-vs-tool-band";
import { MiniFooterStrip } from "./mini-footer-strip";
import { PersonasBand } from "./personas-band";
import { PricingTeaserBand } from "./pricing-teaser-band";
import { ReportPreviewBand } from "./report-preview-band";
import { StatsBand } from "./stats-band";
import { TransparencyBand } from "./transparency-band";

/**
 * Single dark "island" rendered between <HeroSection /> and the global
 * <Footer />. Owns every post-hero band so they share scope, hairlines,
 * and the `.hero-dark` token system from `src/styles/hero-dark.css`.
 */
export function LandingDarkIsland() {
  return (
    <div className="hero-dark landing-dark">
      <Container size="lg" className="px-0 sm:px-6 lg:px-8">
        <div
          className="dark-hairline border-x rounded-none sm:rounded-3xl overflow-hidden my-0 sm:my-10"
          style={{
            borderColor: "rgba(255,255,255,0.07)",
            backgroundColor: "rgb(var(--hero-bg-base))",
          }}
        >
          <StatsBand />
          <ManualVsToolBand />
          <ReportPreviewBand />
          <HowItWorksBand />
          <BentoMetricsBand />
          <PersonasBand />
          <TransparencyBand />
          <PricingTeaserBand />
          <FinalCtaBand />
          <MiniFooterStrip />
        </div>
      </Container>
    </div>
  );
}