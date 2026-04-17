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
        "transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform",
        inView
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-95 translate-y-8",
      )}
    >
      <MockupDashboard />
    </div>
  );
}

export function ProductPreviewSection() {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Decorative cyan glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] max-w-[90vw] rounded-full bg-accent-primary/10 blur-3xl" />
      </div>

      <Container size="lg" className="relative z-10">
        {/* Header */}
        <div className="max-w-2xl mb-12 md:mb-16">
          <span className="font-mono text-xs uppercase tracking-wide text-accent-luminous mb-4 block">
            Preview do produto
          </span>
          <h2 className="font-display text-3xl md:text-5xl font-medium tracking-tight text-content-primary leading-[1.1] mb-6">
            O relatório que recebes no email.
          </h2>
          <p className="font-sans text-lg text-content-secondary leading-relaxed">
            Métricas claras, benchmark visual e comparação com concorrentes.
            Tudo exportável em PDF, partilhável em equipa, construído para
            decisão rápida.
          </p>
        </div>

        {/* Mockup */}
        <MockupWithReveal />

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 mt-16 md:mt-20">
          {highlights.map((item) => (
            <div key={item.label} className="flex flex-col gap-3">
              <span className="font-mono text-xs uppercase tracking-wide text-content-tertiary">
                {item.label}
              </span>
              <h3 className="font-display text-xl font-medium text-content-primary tracking-tight">
                {item.title}
              </h3>
              <p className="font-sans text-sm text-content-secondary leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
