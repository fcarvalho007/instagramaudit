import { Container } from "@/components/layout/container";

const metrics = [
  { value: "35M+", label: "Posts analisados (Socialinsider 2025)" },
  { value: "0,52%", label: "Engagement médio em reels" },
  { value: "3×", label: "Camadas de comparação" },
];

export function SocialProofSection() {
  return (
    <section className="relative border-y border-border-subtle/10 bg-surface-secondary/40">
      <Container size="lg" className="py-12 md:py-16">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10 md:gap-12">
          {/* Left: editorial micro-statement */}
          <div className="flex-1">
            <span className="font-mono text-xs uppercase tracking-wide text-content-tertiary mb-2 block">
              Benchmarks atualizados
            </span>
            <p className="font-display text-xl md:text-2xl text-content-primary leading-snug tracking-tight">
              Dados frescos do Instagram,{" "}
              <br className="hidden md:block" />
              analisados mensalmente.
            </p>
          </div>

          {/* Right: 3 metric blocks */}
          <div className="grid grid-cols-3 gap-6 md:gap-12 w-full md:w-auto">
            {metrics.map((metric) => (
              <div key={metric.label} className="text-left">
                <div className="font-display text-3xl md:text-4xl text-content-primary font-medium tracking-tight mb-1 leading-none">
                  {metric.value}
                </div>
                <div className="font-mono text-[0.65rem] md:text-xs uppercase tracking-wide text-content-tertiary leading-snug">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
