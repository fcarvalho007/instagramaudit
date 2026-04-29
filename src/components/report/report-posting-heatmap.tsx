import { ReportSection } from "./report-section";
import { useReportData } from "./report-data-context";

/**
 * Returns an inline background using the editorial blue token at variable
 * opacity. Keeps the heatmap on a single semantic colour family — no more
 * indigo / slate mix — and means a future palette change in tokens-light.css
 * propagates here automatically.
 */
function intensityStyle(v: number): React.CSSProperties {
  // 5 buckets: 0.06 / 0.18 / 0.36 / 0.6 / 0.92
  const opacity =
    v < 0.2 ? 0.06 : v < 0.4 ? 0.18 : v < 0.6 ? 0.36 : v < 0.8 ? 0.6 : 0.92;
  return { backgroundColor: `rgb(var(--accent-primary) / ${opacity})` };
}

const HOURS_LABELS = ["00h", "04h", "08h", "12h", "16h", "20h"];
const LEGEND_OPACITIES = [0.06, 0.18, 0.36, 0.6, 0.92] as const;

export function ReportPostingHeatmap() {
  const reportData = useReportData();
  const { days, matrix, bestSlots } = reportData.postingHeatmap;
  return (
    <ReportSection
      label="Melhores horários de publicação"
      title="Quando o público responde mais"
      subtitle="Mapa de intensidade de envolvimento por dia da semana e hora do dia."
    >
      <div className="bg-surface-secondary border border-border-default rounded-2xl shadow-card p-6 md:p-8">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Hour labels row */}
            <div className="grid grid-cols-[40px_1fr] gap-2 mb-2">
              <div />
              <div className="grid grid-cols-6">
                {HOURS_LABELS.map((h) => (
                  <span
                    key={h}
                    className="font-mono text-[10px] uppercase tracking-wide text-content-tertiary"
                  >
                    {h}
                  </span>
                ))}
              </div>
            </div>

            {/* Heatmap rows */}
            <div className="space-y-[3px]">
              {days.map((day, dayIdx) => (
                <div
                  key={day}
                  className="grid grid-cols-[40px_1fr] gap-2 items-center"
                >
                  <span className="font-mono text-[10px] uppercase tracking-wide text-content-tertiary">
                    {day}
                  </span>
                  <div
                    className="grid gap-[3px]"
                    style={{
                      gridTemplateColumns: "repeat(24, minmax(0, 1fr))",
                    }}
                  >
                    {matrix[dayIdx].map((v, hourIdx) => (
                      <div
                        key={hourIdx}
                        className="h-6 rounded-[3px]"
                        style={intensityStyle(v)}
                        title={`${day} ${hourIdx
                          .toString()
                          .padStart(2, "0")}h · ${(v * 100).toFixed(0)}%`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-5">
              <span className="font-mono text-[10px] uppercase tracking-wide text-content-tertiary">
                Menos
              </span>
              <div className="flex gap-[3px]">
                {LEGEND_OPACITIES.map((op) => (
                  <span
                    key={op}
                    className="h-3 w-4 rounded-sm"
                    style={{
                      backgroundColor: `rgb(var(--accent-primary) / ${op})`,
                    }}
                  />
                ))}
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wide text-content-tertiary">
                Mais
              </span>
            </div>
          </div>
        </div>

        {/* Best slots */}
        <div className="flex flex-wrap gap-2 pt-6 mt-6 border-t border-border-subtle">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-content-tertiary self-center mr-2">
            Picos detetados
          </span>
          {bestSlots.map((s) => (
            <span
              key={`${s.day}-${s.hour}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-accent-primary/30"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-accent-primary font-semibold">
                {s.day} · {s.hour}
              </span>
              <span className="font-mono text-xs font-medium text-content-primary">
                {s.engagement.toString().replace(".", ",")}%
              </span>
            </span>
          ))}
        </div>
      </div>
    </ReportSection>
  );
}
