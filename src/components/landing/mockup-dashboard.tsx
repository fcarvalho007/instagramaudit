import { Lock, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { MockupBenchmarkGauge } from "./mockup-benchmark-gauge";
import { MockupMetricCard } from "./mockup-metric-card";

const competitors = [
  { name: "@marca_exemplo", value: 0.64, self: true },
  { name: "@concorrente_a", value: 0.48, self: false },
  { name: "@concorrente_b", value: 0.31, self: false },
];

const COMPARISON_SCALE = 0.7;

export function MockupDashboard() {
  return (
    <Card
      variant="default"
      padding="none"
      className="overflow-hidden bg-surface-light-elevated border-slate-200 shadow-[0_25px_50px_-12px_rgb(15_23_42_/_0.25),0_10px_20px_-8px_rgb(15_23_42_/_0.15)]"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50/80 px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-gradient-to-br from-accent-violet to-accent-violet-luminous shrink-0"
            aria-hidden="true"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-display text-base md:text-lg font-medium text-on-light-primary truncate">
              @marca_exemplo
            </span>
            <span className="text-eyebrow text-[0.625rem] text-on-light-tertiary truncate">
              Análise · 30 publicações · 14 Abr 2026
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 rounded-full border border-accent-violet/30 bg-accent-violet/15 px-2.5 py-1">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-accent-violet animate-pulse"
          />
          <span className="text-eyebrow text-[0.625rem] text-accent-violet-deep">
            <span className="hidden sm:inline">Relatório completo</span>
            <span className="sm:hidden">Completo</span>
          </span>
        </div>
      </div>

      {/* Body — progressive blur reveal */}
      <div className="relative bg-surface-light-elevated">
        <div
          aria-hidden="true"
          className="p-4 md:p-6 space-y-4 md:space-y-6"
          style={{
            filter: "blur(0.5px)",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 35%, rgba(0,0,0,0.6) 65%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 35%, rgba(0,0,0,0.6) 65%, transparent 100%)",
          }}
        >
          {/* Metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MockupMetricCard
              tone="light"
              label="Envolvimento médio"
              value="0,64%"
              trend="+0,18 vs benchmark"
              variant="success"
              featured
            />
            <MockupMetricCard
              tone="light"
              label="Publicações analisadas"
              value="30"
              suffix="últimos 30 dias"
            />
            <MockupMetricCard
              tone="light"
              label="Frequência semanal"
              value="3,2"
              suffix="publicações/sem"
            />
            <MockupMetricCard
              tone="light"
              label="Formato dominante"
              value="Reels"
              badge="62%"
            />
          </div>

          {/* Benchmark gauge */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 md:p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-eyebrow-sm text-[0.625rem] text-on-light-tertiary">
                  Benchmark · Reels
                </span>
                <span className="font-sans text-sm text-on-light-secondary">
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
            <span className="text-eyebrow-sm text-[0.625rem] text-on-light-tertiary block">
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
                        "font-sans text-xs md:text-sm truncate",
                        row.self
                          ? "text-on-light-primary font-semibold"
                          : "text-on-light-secondary",
                      )}
                    >
                      {row.name}
                    </span>
                    <div className="relative h-2 rounded-full bg-slate-200 border border-slate-300 overflow-hidden">
                      <div
                        className={cn(
                          "absolute inset-y-0 left-0 h-full rounded-full",
                          row.self
                            ? "bg-gradient-to-r from-accent-primary to-accent-luminous shadow-[0_0_12px_-2px_rgb(6_182_212_/_0.4)]"
                            : "bg-slate-400",
                        )}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "font-mono text-xs md:text-sm text-right",
                        row.self
                          ? "text-on-light-primary font-semibold"
                          : "text-on-light-secondary",
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
          <div className="rounded-lg border border-accent-violet/20 bg-violet-50 p-4 md:p-5">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-violet/10 border border-accent-violet/30 text-accent-violet-deep">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex flex-col gap-2 min-w-0">
                <span className="text-eyebrow-sm text-[0.625rem] text-accent-violet-deep">
                  Insight prioritário
                </span>
                <p className="font-sans text-sm md:text-base text-on-light-secondary leading-relaxed">
                  A performance em Reels está 23% acima do benchmark. A
                  frequência pode subir de 3,2 para 4 publicações/semana sem
                  saturar — os concorrentes publicam menos mas com menor
                  envolvimento.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Soft gradient fade — invites scroll, hides bottom content */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-b from-transparent via-surface-light-elevated/80 to-surface-light-elevated" />

        {/* Central intrigue label with lock icon */}
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
          <span className="text-eyebrow-sm inline-flex items-center gap-2 text-[0.625rem] text-on-light-secondary px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Conteúdo completo no relatório
          </span>
        </div>
      </div>
    </Card>
  );
}
