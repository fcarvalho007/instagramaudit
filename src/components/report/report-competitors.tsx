import { ReportSection } from "./report-section";
import { useReportData } from "./report-data-context";
import { cn } from "@/lib/utils";

export function ReportCompetitors() {
  const reportData = useReportData();
  const max = Math.max(...reportData.competitors.map((c) => c.engagement)) * 1.4;

  return (
    <ReportSection
      label="Comparação com concorrentes"
      title="Desempenho vs. concorrência direta"
      subtitle="Envolvimento médio dos últimos 30 dias por perfil."
    >
      <div className="bg-surface-secondary border border-border-default/40 rounded-xl shadow-card p-6 md:p-8">
        <div className="space-y-5">
          {reportData.competitors.map((c) => {
            const pct = (c.engagement / max) * 100;
            return (
              <div
                key={c.username}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-4 md:gap-6"
              >
                <div className="flex items-center gap-3 min-w-0 md:w-[220px]">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full bg-gradient-to-br shrink-0 ring-1 ring-white",
                      c.avatarGradient,
                    )}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-content-primary truncate">
                      @{c.username}
                    </p>
                    {c.isOwn && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider bg-tint-primary text-accent-primary font-semibold">
                        Perfil
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative h-3 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className={cn(
                      "absolute left-0 top-0 h-full rounded-full",
                      c.isOwn
                        ? "bg-gradient-to-r from-indigo-400 via-blue-500 to-cyan-400"
                        : "bg-slate-300",
                    )}
                    style={{
                      width: `${pct}%`,
                      boxShadow: c.isOwn
                        ? "0 0 10px rgb(59 130 246 / 0.3)"
                        : undefined,
                    }}
                  />
                </div>

                <div className="text-right w-[80px]">
                  <span className="font-mono font-medium text-sm text-content-primary">
                    {c.engagement.toString().replace(".", ",")}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-sm text-content-secondary leading-relaxed pt-6 mt-6 border-t border-border-subtle/30">
          O perfil analisado lidera o grupo de comparação em envolvimento, mas
          a vantagem é estreita. A diferença para o segundo concorrente é de
          apenas 0,18 pontos percentuais — um cenário sensível a variações
          mensais.
        </p>
      </div>
    </ReportSection>
  );
}
