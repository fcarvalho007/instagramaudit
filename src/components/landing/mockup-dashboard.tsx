import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { MockupBenchmarkGauge } from "./mockup-benchmark-gauge";
import { MockupMetricCard } from "./mockup-metric-card";

const competitors = [
  { name: "@example_brand", value: 0.64, self: true },
  { name: "@competitor_a", value: 0.48, self: false },
  { name: "@competitor_b", value: 0.31, self: false },
];

const COMPARISON_SCALE = 0.7;

export function MockupDashboard() {
  return (
    <Card
      variant="glass"
      padding="none"
      className="overflow-hidden border-border-strong shadow-xl"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 border-b border-border-subtle bg-surface-secondary/40 px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-gradient-to-br from-accent-primary to-accent-luminous shrink-0"
            aria-hidden="true"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-display text-base md:text-lg font-medium text-content-primary truncate">
              @example_brand
            </span>
            <span className="font-mono text-[0.625rem] md:text-xs text-content-tertiary truncate">
              Análise · 30 posts · 14 Abr 2026
            </span>
          </div>
        </div>
        <Badge variant="success" size="sm" dot pulse className="shrink-0">
          <span className="hidden sm:inline">Relatório completo</span>
          <span className="sm:hidden">Completo</span>
        </Badge>
      </div>

      {/* Body — progressive blur reveal */}
      <div className="relative">
        <div
          aria-hidden="true"
          className="p-4 md:p-6 space-y-4 md:space-y-6"
          style={{
            filter: "blur(0.5px)",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 25%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.4) 80%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 25%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.4) 80%, transparent 100%)",
          }}
        >
          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MockupMetricCard
              label="Engagement médio"
              value="0,64%"
              trend="+0,18 vs benchmark"
              variant="success"
            />
            <MockupMetricCard
              label="Posts analisados"
              value="30"
              suffix="últimos 30d"
            />
            <MockupMetricCard
              label="Frequência semanal"
              value="3,2"
              suffix="posts/sem"
            />
            <MockupMetricCard
              label="Formato dominante"
              value="Reels"
              badge="62%"
            />
          </div>

          {/* Benchmark gauge */}
          <div className="rounded-lg border border-border-subtle bg-surface-base/40 p-4 md:p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="font-mono text-[0.625rem] uppercase tracking-wide text-content-tertiary">
                  Benchmark · Reels
                </span>
                <span className="font-sans text-sm text-content-secondary">
                  Posicionamento face ao esperado
                </span>
              </div>
              <Badge variant="success" size="sm" className="shrink-0">
                Acima benchmark
              </Badge>
            </div>
            <MockupBenchmarkGauge value={0.64} benchmark={0.52} max={1.2} />
          </div>

          {/* Competitor comparison */}
          <div className="space-y-3">
            <span className="font-mono text-[0.625rem] uppercase tracking-wide text-content-tertiary block">
              Comparação com concorrentes
            </span>
            <div className="space-y-2.5">
              {competitors.map((row) => {
                const widthPct = Math.min(
                  (row.value / COMPARISON_SCALE) * 100,
                  100,
                );
                return (
                  <div
                    key={row.name}
                    className="grid grid-cols-[110px_1fr_56px] md:grid-cols-[160px_1fr_64px] gap-3 md:gap-4 items-center"
                  >
                    <span
                      className={cn(
                        "font-mono text-xs md:text-sm truncate",
                        row.self
                          ? "text-content-primary"
                          : "text-content-secondary",
                      )}
                    >
                      {row.name}
                    </span>
                    <div className="relative h-2 rounded-full bg-surface-base/60 border border-border-subtle overflow-hidden">
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0 h-full rounded-full",
                          row.self
                            ? "bg-gradient-to-r from-accent-primary to-accent-luminous shadow-glow-cyan"
                            : "bg-content-tertiary/40",
                        )}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "font-mono text-xs md:text-sm text-right",
                        row.self
                          ? "text-content-primary"
                          : "text-content-secondary",
                      )}
                    >
                      {row.value.toFixed(2).replace(".", ",")}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI insight */}
          <div className="rounded-lg border border-border-subtle bg-surface-elevated/60 p-4 md:p-5">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-primary/10 border border-accent-primary/30 text-accent-luminous">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-2 min-w-0">
                <span className="font-mono text-[0.625rem] uppercase tracking-wide text-accent-luminous">
                  Insight prioritário
                </span>
                <p className="font-sans text-sm md:text-base text-content-secondary leading-relaxed">
                  A performance em Reels está 23% acima do benchmark. A
                  frequência pode subir de 3,2 para 4 posts/semana sem saturar
                  — os concorrentes publicam menos mas com menor engagement.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Soft gradient fade to base at the very bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent via-surface-base/40 to-surface-base" />

        {/* Central intrigue label */}
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-content-tertiary/80 px-3 py-1.5 rounded-full bg-surface-base/60 backdrop-blur-sm border border-border-subtle">
            Conteúdo completo no relatório
          </span>
        </div>
      </div>
    </Card>
  );
}
