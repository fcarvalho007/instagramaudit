import { Check } from "lucide-react";

import { Container } from "@/components/layout/container";
import { HeroActionBar } from "@/components/landing/hero-action-bar";
import { HeroAuroraBackground } from "@/components/landing/hero-aurora-background";

const proofPoints = [
  "Análise em 30 segundos",
  "Sem registo necessário",
  "RGPD compliant",
];

export function HeroSection() {
  return (
    <section className="relative min-h-[92vh] w-full overflow-hidden bg-surface-base flex items-center">
      <HeroAuroraBackground />

      <Container size="lg" className="relative z-10 py-20 md:py-28">
        {/* 1. Action bar FIRST */}
        <div className="mb-16 md:mb-20">
          <HeroActionBar />
        </div>

        {/* 2. Headline + sub-headline AFTER */}
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl tracking-tight font-medium leading-[1.05] text-content-primary">
            O benchmark de Instagram
            <span className="block bg-gradient-to-r from-accent-primary to-accent-luminous bg-clip-text text-transparent">
              que faltava ao mercado.
            </span>
          </h1>

          <p className="font-sans text-lg md:text-xl text-content-secondary leading-relaxed max-w-2xl mx-auto">
            Análise instantânea de qualquer perfil público, comparação com até
            dois concorrentes e relatório detalhado com leitura estratégica por
            IA. Enviado por email. Sem custos.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-4">
            {proofPoints.map((point) => (
              <div key={point} className="flex items-center gap-2">
                <Check className="size-4 text-signal-success" aria-hidden="true" />
                <span className="font-mono text-xs uppercase tracking-wide text-content-tertiary">
                  {point}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
