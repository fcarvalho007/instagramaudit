import { Container } from "@/components/layout/container";

function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-surface-elevated ${className ?? ""}`}
    />
  );
}

export function AnalysisSkeleton({ username }: { username?: string }) {
  return (
    <div className="bg-surface-base">
      <Container size="lg" as="section" className="py-10 md:py-16 space-y-12 md:space-y-16">
        {/* Header */}
        <div className="flex flex-col gap-6 border-b border-border-subtle pb-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4 md:gap-5">
            <Pulse className="size-16 md:size-20 rounded-full" />
            <div className="flex flex-col gap-2 min-w-0">
              <Pulse className="h-3 w-24" />
              <Pulse className="h-7 w-56" />
              <Pulse className="h-4 w-72" />
            </div>
          </div>
          <Pulse className="h-6 w-36 rounded-full" />
        </div>

        {/* Status line */}
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
            A analisar perfil
          </span>
          <p className="font-display text-lg md:text-xl text-content-primary tracking-tight">
            {username ? `A processar @${username.replace(/^@/, "")}` : "A processar análise"}
          </p>
          <p className="font-sans text-sm text-content-secondary max-w-md">
            A recolher dados públicos e a calcular o posicionamento face ao benchmark.
          </p>
        </div>

        {/* Metrics row */}
        <div className="space-y-5">
          <div className="flex items-baseline justify-between gap-4">
            <Pulse className="h-5 w-32" />
            <Pulse className="h-3 w-24" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-border-subtle bg-surface-secondary p-5 space-y-3"
              >
                <Pulse className="h-3 w-20" />
                <Pulse className="h-8 w-24" />
                <Pulse className="h-3 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* Benchmark block */}
        <div className="rounded-xl border border-border-subtle bg-surface-secondary p-5 md:p-6 space-y-5">
          <Pulse className="h-3 w-48" />
          <Pulse className="h-6 w-72" />
          <Pulse className="h-2.5 w-full rounded-full" />
          <div className="flex justify-between gap-4">
            <Pulse className="h-4 w-24" />
            <Pulse className="h-4 w-24" />
            <Pulse className="h-4 w-16" />
          </div>
        </div>
      </Container>
    </div>
  );
}
