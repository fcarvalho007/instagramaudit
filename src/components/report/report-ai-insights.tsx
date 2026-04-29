import { Sparkles } from "lucide-react";
import { ReportSection } from "./report-section";
import { useReportData } from "./report-data-context";

// Sparkles continua a ser usado no cabeçalho do bloco com insights reais.

export function ReportAiInsights() {
  const reportData = useReportData();
  const insights = reportData.aiInsights;

  // Quando não existem insights gerados, escondemos a secção por completo
  // em vez de mostrar um placeholder. Mantém o relatório limpo e editorial.
  if (insights.length === 0) {
    return null;
  }

  return (
    <ReportSection
      label="Insights estratégicos · gerados por IA"
      title="Leitura estratégica"
      subtitle="Síntese acionável com base nos sinais detetados ao longo do relatório."
    >
      <div className="relative bg-surface-secondary border border-border-default rounded-2xl shadow-card p-6 md:p-8 overflow-hidden">
        <div className="flex items-start gap-4 mb-6">
          <div className="h-10 w-10 rounded-full bg-tint-primary flex items-center justify-center shrink-0">
            <Sparkles className="size-5 text-accent-primary" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-content-tertiary">
              Análise preparada por
            </p>
            <p className="text-sm font-medium text-content-primary">
              InstaBench AI · Modelo de leitura editorial
            </p>
          </div>
        </div>

        <div className="space-y-5">
          {insights.map((ins, i) => (
            <div key={ins.number}>
              {i > 0 && (
                <div className="border-t border-border-subtle mb-5" />
              )}
              <div className="flex gap-4 md:gap-5">
                <div className="shrink-0 h-9 w-9 rounded-md border border-border-default flex items-center justify-center">
                  <span className="font-mono text-xs font-semibold text-content-primary">
                    {ins.number}
                  </span>
                </div>
                <div className="flex-1 space-y-2">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-content-tertiary font-semibold">
                    {ins.label}
                  </p>
                  <p className="text-sm md:text-[15px] text-content-primary leading-relaxed">
                    {ins.text}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ReportSection>
  );
}
