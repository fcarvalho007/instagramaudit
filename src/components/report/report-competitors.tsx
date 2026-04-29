import { ReportSection } from "./report-section";
import { useReportData } from "./report-data-context";
import { cn } from "@/lib/utils";

export function ReportCompetitors() {
  const reportData = useReportData();
  const competitors = reportData.competitors;
  const isAdminPreview = reportData.meta?.isAdminPreview ?? false;
  const windowLabel = reportData.meta?.windowLabel ?? "últimos 30 dias";

  // No competitor data and we're in admin preview → hide entirely.
  if (competitors.length === 0 && isAdminPreview) {
    return null;
  }

  // No competitor data outside admin preview → render an editorial empty
  // state so the layout flow is preserved (defensive; the mock always has
  // competitors so this only triggers in custom embeddings).
  if (competitors.length === 0) {
    return (
      <ReportSection
        label="Comparação com concorrentes"
        title="Desempenho vs. concorrência direta"
        subtitle={`Envolvimento médio dos ${windowLabel} por perfil.`}
      >
        <div className="bg-surface-secondary border border-border-default rounded-2xl shadow-card p-6 md:p-8">
          <p className="text-sm text-content-secondary leading-relaxed">
            Sem concorrentes recolhidos para este snapshot.
          </p>
        </div>
      </ReportSection>
    );
  }

  const max = Math.max(...competitors.map((c) => c.engagement)) * 1.4;
  const hasMultipleCompetitors = competitors.length > 1;

  return (
    <ReportSection
      label="Comparação com concorrentes"
      title="Desempenho vs. concorrência direta"
      subtitle={`Envolvimento médio dos ${windowLabel} por perfil.`}
    >
      <div className="bg-surface-secondary border border-border-default rounded-2xl shadow-card p-6 md:p-8">
        <div className="space-y-5">
          {competitors.map((c) => {
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
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full border border-accent-primary/30 font-mono text-[9px] uppercase tracking-[0.12em] text-accent-primary font-semibold">
                        Perfil
                      </span>
                    )}
                  </div>
                </div>

                <div className="relative h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className={cn(
                      "absolute left-0 top-0 h-full rounded-full",
                      c.isOwn
                        ? "bg-accent-primary"
                        : "bg-content-tertiary/40",
                    )}
                    style={{ width: `${pct}%` }}
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

        {hasMultipleCompetitors ? (
          <p className="text-sm text-content-secondary leading-relaxed pt-6 mt-6 border-t border-border-subtle">
            O perfil analisado lidera o grupo de comparação em envolvimento, mas
            a vantagem é estreita. A diferença para o segundo concorrente é de
            apenas 0,18 pontos percentuais — um cenário sensível a variações
            mensais.
          </p>
        ) : (
          <p className="text-sm text-content-secondary leading-relaxed pt-6 mt-6 border-t border-border-subtle">
            Apenas o perfil analisado está incluído neste snapshot. Adicione
            concorrentes para uma leitura comparativa.
          </p>
        )}
      </div>
    </ReportSection>
  );
}
