import { Sparkles } from "lucide-react";
import { ReportSection } from "./report-section";
import { useReportData } from "./report-data-context";

export function ReportAiInsights() {
  const reportData = useReportData();
  const insights = reportData.aiInsights;
  const isAdminPreview = reportData.meta?.isAdminPreview ?? false;

  // Empty state — surface clearly that insights have not been generated for
  // this snapshot, instead of leaving the section visually blank.
  if (insights.length === 0) {
    return (
      <ReportSection
        label="Insights estratégicos · gerados por IA"
        title="Leitura estratégica"
        subtitle="Síntese acionável com base nos sinais detetados ao longo do relatório."
      >
        <div
          className="relative bg-surface-secondary border border-border-default/40 rounded-xl shadow-card p-6 md:p-8 overflow-hidden"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgb(224 231 255 / 0.35) 0%, rgb(207 250 254 / 0.25) 100%)",
          }}
        >
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-tint-indigo flex items-center justify-center shrink-0">
              <Sparkles className="size-5 text-accent-secondary" />
            </div>
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-wider text-content-tertiary">
                Insights estratégicos
              </p>
              <p className="text-sm text-content-primary leading-relaxed">
                {isAdminPreview
                  ? "Insights de IA ainda não foram gerados para este snapshot."
                  : "Os insights estratégicos serão gerados em breve."}
              </p>
            </div>
          </div>
        </div>
      </ReportSection>
    );
  }

  return (
    <ReportSection
      label="Insights estratégicos · gerados por IA"
      title="Leitura estratégica"
      subtitle="Síntese acionável com base nos sinais detetados ao longo do relatório."
    >
      <div
        className="relative bg-surface-secondary border border-border-default/40 rounded-xl shadow-card p-6 md:p-8 overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgb(224 231 255 / 0.35) 0%, rgb(207 250 254 / 0.25) 100%)",
        }}
      >
        <div className="flex items-start gap-4 mb-6">
          <div className="h-10 w-10 rounded-full bg-tint-indigo flex items-center justify-center shrink-0">
            <Sparkles className="size-5 text-accent-secondary" />
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
                <div className="border-t border-border-subtle/30 mb-5" />
              )}
              <div className="flex gap-4 md:gap-5">
                <div className="shrink-0 h-9 w-9 rounded-md border border-border-default/40 bg-surface-secondary flex items-center justify-center">
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
