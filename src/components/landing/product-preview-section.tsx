import { Container } from "@/components/layout/container";
import { cn } from "@/lib/utils";

import { MockupDashboard } from "./mockup-dashboard";
import { useInView } from "./use-in-view";

const highlights = [
  {
    label: "Dados",
    title: "Métricas accionáveis",
    description:
      "Engagement, alcance, frequência e formato dominante. Tudo o que importa, nada do que distrai.",
  },
  {
    label: "Benchmark",
    title: "Comparação imediata",
    description:
      "Cada métrica contextualizada face ao benchmark da plataforma e da dimensão do perfil.",
  },
  {
    label: "IA",
    title: "Leitura estratégica",
    description:
      "Três insights prioritários gerados por IA, com recomendações concretas para os próximos 30 dias.",
  },
];

function MockupWithReveal() {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn(
        "relative transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform",
        inView
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-95 translate-y-8",
      )}
    >
      {/* Studio light spotlight behind the mockup */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none"
      >
        <div className="h-[120%] w-[110%] max-w-[95vw] rounded-full bg-[radial-gradient(ellipse_at_center,_rgb(255_255_255)_0%,_rgb(255_255_255_/_0.5)_30%,_transparent_65%)]" />
      </div>

      {/* Editorial frame with corner brackets */}
      <div className="relative rounded-3xl border border-slate-200/70 bg-white/50 backdrop-blur-sm p-3 md:p-5 shadow-[0_30px_60px_-20px_rgb(15_23_42_/_0.25),_0_60px_120px_-40px_rgb(139_92_246_/_0.15)]">
        {/* Corner brackets */}
        {[
          "top-2 left-2 border-t border-l rounded-tl-md",
          "top-2 right-2 border-t border-r rounded-tr-md",
          "bottom-2 left-2 border-b border-l rounded-bl-md",
          "bottom-2 right-2 border-b border-r rounded-br-md",
        ].map((pos, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={cn(
              "absolute h-3 w-3 border-slate-400/60 pointer-events-none",
              pos,
            )}
          />
        ))}
        <MockupDashboard />
      </div>
    </div>
  );
}

export function ProductPreviewSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-surface-base via-surface-light to-surface-light pt-32 md:pt-40 pb-24 md:pb-32">
      {/* Top transition fade — dark to light */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-32 md:h-40 bg-gradient-to-b from-surface-base to-transparent"
      />

      {/* Top hairline divider with violet fade */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-violet/40 to-transparent"
      />

      <Container size="lg" className="relative z-10">
        {/* Header — dark text on light surface */}
        <div className="max-w-2xl mb-12 md:mb-16">
          <span className="font-mono text-xs uppercase tracking-wide text-accent-violet mb-4 block">
            Preview do produto
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-medium tracking-tight text-on-light-primary leading-[1.1] mb-6">
            O relatório que recebes no email.
          </h2>
          <p className="font-sans text-lg text-on-light-secondary leading-relaxed">
            Métricas claras, benchmark visual e comparação com concorrentes.
            Tudo exportável em PDF, partilhável em equipa, construído para
            decisão rápida.
          </p>
        </div>

        {/* Mockup with editorial framing */}
        <MockupWithReveal />

        {/* Feature highlights — dark on light */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mt-16 md:mt-20">
          {highlights.map((item) => (
            <div key={item.label} className="flex flex-col gap-3">
              <span className="font-mono text-xs uppercase tracking-wide text-on-light-tertiary">
                {item.label}
              </span>
              <h3 className="font-display text-xl font-medium text-on-light-primary tracking-tight">
                {item.title}
              </h3>
              <p className="font-sans text-sm text-on-light-secondary leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
