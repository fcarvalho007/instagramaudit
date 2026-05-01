import { Container } from "@/components/layout/container";

const metrics = [
  { value: "35M+", label: "Posts analisados (Socialinsider 2025)" },
  { value: "0,52%", label: "Engagement médio em reels" },
  { value: "3×", label: "Camadas de comparação" },
];

export function SocialProofSection() {
  return (
    <section className="relative overflow-hidden bg-surface-secondary/40">
      {/* Top luminous divider */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-violet/30 to-transparent"
      />

      {/* Subtle HUD micro-grid background */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(255 255 255 / 0.6) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.6) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <Container size="lg" className="relative py-12 md:py-16">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-10 md:gap-12">
          {/* Left: editorial micro-statement */}
          <div className="flex-1">
            <span className="text-eyebrow text-content-tertiary mb-2 block">
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
                <div className="relative inline-block mb-2">
                  <div className="font-display text-3xl md:text-4xl text-content-primary font-medium tracking-tight leading-none">
                    {metric.value}
                  </div>
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-1.5 left-0 h-[2px] w-8 bg-gradient-to-r from-accent-violet to-accent-violet-luminous rounded-full"
                  />
                </div>
                <div className="text-eyebrow text-[0.65rem] md: text-content-secondary leading-snug">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>

      {/* Bottom hairline */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-border-default"
      />
    </section>
  );
}
