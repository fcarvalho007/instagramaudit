import { ReportSection } from "./report-section";
import { reportData } from "./report-mock-data";

export function ReportHashtagsKeywords() {
  const maxHashtagUses = Math.max(
    ...reportData.topHashtags.map((h) => h.uses),
  );
  const maxKeywordCount = Math.max(
    ...reportData.topKeywords.map((k) => k.count),
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Hashtags */}
      <ReportSection
        label="Hashtags mais usadas"
        title="Que etiquetas estão a ser usadas"
        subtitle="Frequência de uso e envolvimento médio associado."
      >
        <div className="bg-surface-secondary border border-border-default/40 rounded-xl shadow-card p-6">
          <ul className="space-y-4">
            {reportData.topHashtags.map((h) => {
              const pct = (h.uses / maxHashtagUses) * 100;
              return (
                <li key={h.tag} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-sm font-medium text-content-primary">
                      {h.tag}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-xs text-content-tertiary">
                        {h.uses} usos
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent-primary" />
                        <span className="font-mono text-xs font-medium text-content-primary">
                          {h.avgEngagement.toString().replace(".", ",")}%
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-blue-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </ReportSection>

      {/* Keywords */}
      <ReportSection
        label="Palavras-chave dominantes"
        title="O que está a ser dito nas captions"
        subtitle="Termos mais frequentes ao longo das publicações analisadas."
      >
        <div className="bg-surface-secondary border border-border-default/40 rounded-xl shadow-card p-6">
          <ul className="space-y-4">
            {reportData.topKeywords.map((k) => {
              const pct = (k.count / maxKeywordCount) * 100;
              return (
                <li key={k.word} className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-display text-base font-medium text-content-primary">
                      {k.word}
                    </span>
                    <span className="font-mono text-xs text-content-tertiary">
                      {k.count} ocorrências
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </ReportSection>
    </div>
  );
}
