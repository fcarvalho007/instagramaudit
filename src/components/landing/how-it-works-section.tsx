import { AtSign, LineChart, Mail } from "lucide-react";

import { Container } from "@/components/layout/container";
import { HowItWorksStep } from "./how-it-works-step";

export function HowItWorksSection() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* HUD vertical lines background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(90deg, transparent 0, transparent 79px, rgb(255 255 255) 79px, rgb(255 255 255) 80px)",
          backgroundSize: "80px 100%",
        }}
      />

      {/* Soft violet radial glow */}
      <div
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] max-w-[80vw] rounded-full bg-accent-violet/[0.06] blur-3xl pointer-events-none"
      />

      <Container size="lg" className="relative">
        {/* Section header */}
        <div className="max-w-2xl mb-16 md:mb-20">
          <span className="font-mono text-xs uppercase tracking-wide text-accent-violet-luminous mb-4 block">
            Como funciona
          </span>
          <h2 className="font-display text-3xl md:text-5xl text-content-primary font-medium tracking-tight leading-[1.1] mb-6">
            Relatório em 3 passos simples.
          </h2>
          <p className="font-sans text-lg text-content-secondary leading-relaxed">
            Sem fricção, sem registo, sem tempo perdido. Apenas análise
            clara, benchmarks comparáveis e leitura estratégica pronta a
            aplicar.
          </p>
        </div>

        {/* 3 steps grid with dashed connector on desktop */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          {/* Dashed connector — only between icons on desktop */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-7 left-[16.66%] right-[16.66%] border-t border-dashed border-border-default pointer-events-none"
          />
          <HowItWorksStep
            number="01"
            title="Inserir o username"
            description="Qualquer perfil público do Instagram. Opcionalmente, até dois concorrentes para comparação directa."
            icon={<AtSign />}
            delay={0}
          />
          <HowItWorksStep
            number="02"
            title="Análise automática"
            description="Os últimos 30 posts são processados contra benchmarks atualizados da plataforma e da dimensão do perfil."
            icon={<LineChart />}
            delay={150}
          />
          <HowItWorksStep
            number="03"
            title="Relatório no email"
            description="PDF detalhado com métricas, ranking de concorrentes e três insights estratégicos gerados por IA."
            icon={<Mail />}
            delay={300}
          />
        </div>
      </Container>
    </section>
  );
}
