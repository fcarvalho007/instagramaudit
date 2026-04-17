import { useState } from "react";
import {
  Compass,
  FileText,
  Lock,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AnalysisPremiumTeasers } from "@/lib/mock-analysis";

import { ReportGateModal } from "./report-gate-modal";

interface PremiumLockedSectionProps {
  teasers: AnalysisPremiumTeasers;
  username?: string;
}

export function PremiumLockedSection({ teasers, username }: PremiumLockedSectionProps) {
  const [gateOpen, setGateOpen] = useState(false);
  const cards = [
    {
      icon: TrendingUp,
      label: "Alcance estimado",
      value: teasers.estimatedReach,
      hint: "intervalo de impressões previstas",
    },
    {
      icon: Sparkles,
      label: "Insights por IA",
      value: `${teasers.aiInsightsCount} insights`,
      hint: "interpretação estratégica do contexto",
    },
    {
      icon: Target,
      label: "Oportunidades prioritárias",
      value: `${teasers.opportunitiesCount} oportunidades`,
      hint: "ordenadas por impacto previsto",
    },
    {
      icon: Compass,
      label: "Recomendações 30 dias",
      value: `${teasers.recommendations30d} acções`,
      hint: "roteiro accionável por semana",
    },
  ];

  return (
    <section
      aria-labelledby="premium-heading"
      className="relative space-y-8"
    >
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border-subtle" aria-hidden="true" />
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-content-tertiary">
            Conteúdo premium
          </span>
          <span className="h-px flex-1 bg-border-subtle" aria-hidden="true" />
        </div>
        <h2
          id="premium-heading"
          className="font-display text-2xl md:text-3xl font-medium text-content-primary tracking-tight text-center"
        >
          Disponível no relatório completo
        </h2>
      </header>

      <div className="relative">
        {/* Teaser grid (blurred) */}
        <div
          aria-hidden="true"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 select-none"
          style={{
            filter: "blur(6px)",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 40%, rgba(0,0,0,0.5) 80%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 40%, rgba(0,0,0,0.5) 80%, transparent 100%)",
          }}
        >
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-xl border border-border-subtle bg-surface-secondary p-5 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-accent-violet/10 border border-accent-violet/30 text-accent-violet-luminous">
                    <Icon className="size-5" />
                  </div>
                  <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-content-tertiary">
                    {card.label}
                  </span>
                </div>
                <div className="font-display text-2xl font-medium text-content-primary tracking-tight">
                  {card.value}
                </div>
                <p className="font-sans text-sm text-content-secondary">
                  {card.hint}
                </p>
              </div>
            );
          })}
        </div>

        {/* Overlay CTA */}
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-10 md:pb-14">
          <div className="pointer-events-auto flex flex-col items-center gap-5 max-w-md text-center px-6">
            <div className="flex size-12 items-center justify-center rounded-full border border-accent-violet/40 bg-surface-base/90 backdrop-blur-md text-accent-violet-luminous shadow-glow-violet">
              <Lock className="size-5" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <p className="font-display text-xl font-medium text-content-primary tracking-tight">
                Três insights estratégicos por IA, alcance estimado e plano para 30 dias.
              </p>
              <p className="font-sans text-sm text-content-secondary">
                PDF detalhado enviado por email. Sem cartão.
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              leftIcon={<FileText />}
              onClick={() => setGateOpen(true)}
            >
              Desbloquear relatório completo
            </Button>
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-content-tertiary">
              Dois relatórios gratuitos por mês
            </span>
          </div>
        </div>
      </div>

      <ReportGateModal
        open={gateOpen}
        onOpenChange={setGateOpen}
        username={username}
      />
    </section>
  );
}
