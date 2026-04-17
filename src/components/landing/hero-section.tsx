import { Container } from "@/components/layout/container";
import { BlurRevealText } from "@/components/landing/blur-reveal-text";
import { HandwrittenNote } from "@/components/landing/handwritten-note";
import { HeroActionBar } from "@/components/landing/hero-action-bar";
import { HeroAuroraBackground } from "@/components/landing/hero-aurora-background";
import { ScrollIndicator } from "@/components/landing/scroll-indicator";

export function HeroSection() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-surface-base flex items-center">
      <HeroAuroraBackground />

      <Container size="lg" className="relative z-10 py-20 md:py-28">
        <div className="max-w-4xl mx-auto text-center space-y-6 md:space-y-8">
          {/* Headline — blur reveal, no gradient */}
          <BlurRevealText
            text="Analisa o teu Instagram em menos de 30 segundos."
            as="h1"
            className="font-display text-4xl md:text-6xl lg:text-7xl tracking-tight font-medium leading-[1.05] text-content-primary text-balance"
            delayMs={200}
          />

          {/* Subtitle — single line on desktop, wraps naturally on mobile */}
          <BlurRevealText
            text="Benchmark, comparação e insights claros para decidir melhor."
            as="p"
            className="font-sans text-lg md:text-xl text-content-secondary/95 leading-relaxed max-w-3xl mx-auto md:whitespace-nowrap"
            delayMs={800}
          />

          {/* Action bar with handwritten note anchored top-right */}
          <div className="relative pt-10 md:pt-12">
            <HeroActionBar />
            <HandwrittenNote className="absolute -top-6 right-0 sm:-top-8 sm:right-4 md:right-12 lg:right-20 hidden sm:block" />
          </div>
        </div>
      </Container>

      <ScrollIndicator />
    </section>
  );
}
