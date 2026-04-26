import { ReportSection } from "./report-section";
import { useReportData } from "./report-data-context";
import { cn } from "@/lib/utils";

function intensityClass(v: number): string {
  if (v < 0.2) return "bg-slate-100";
  if (v < 0.4) return "bg-blue-100";
  if (v < 0.6) return "bg-blue-300";
  if (v < 0.8) return "bg-blue-500";
  return "bg-indigo-700";
}

const HOURS_LABELS = ["00h", "04h", "08h", "12h", "16h", "20h"];

export function ReportPostingHeatmap() {
  const { days, matrix, bestSlots } = reportData.postingHeatmap;
  return (
    <ReportSection
      label="Melhores horários de publicação"
      title="Quando o público responde mais"
      subtitle="Mapa de intensidade de envolvimento por dia da semana e hora do dia."
    >
      <div className="bg-surface-secondary border border-border-default/40 rounded-xl shadow-card p-6 md:p-8">
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
                        className={cn(
                          "h-6 rounded-[3px]",
                          intensityClass(v),
                        )}
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
                <span className="h-3 w-4 rounded-sm bg-slate-100" />
                <span className="h-3 w-4 rounded-sm bg-blue-100" />
                <span className="h-3 w-4 rounded-sm bg-blue-300" />
                <span className="h-3 w-4 rounded-sm bg-blue-500" />
                <span className="h-3 w-4 rounded-sm bg-indigo-700" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wide text-content-tertiary">
                Mais
              </span>
            </div>
          </div>
        </div>

        {/* Best slots */}
        <div className="flex flex-wrap gap-2 pt-6 mt-6 border-t border-border-subtle/30">
          <span className="font-mono text-[10px] uppercase tracking-wider text-content-tertiary self-center mr-2">
            Picos detetados
          </span>
          {bestSlots.map((s) => (
            <span
              key={`${s.day}-${s.hour}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-tint-primary border border-accent-primary/20"
            >
              <span className="font-mono text-[10px] uppercase tracking-wider text-accent-primary font-semibold">
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
