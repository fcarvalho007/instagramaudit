import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { ReportSection } from "./report-section";
import { ReportChartTooltip } from "./report-chart-tooltip";
import { useReportData } from "./report-data-context";

export function ReportBestDays() {
  const reportData = useReportData();
  return (
    <ReportSection
      label="Dias da semana"
      title="Desempenho médio por dia"
      subtitle="Envolvimento médio agregado das publicações por dia da semana."
    >
      <div className="bg-surface-secondary border border-border-default rounded-2xl shadow-card p-4 md:p-6">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={reportData.bestDays}
              margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgb(15 23 42 / 0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "rgb(148 163 184)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "rgb(148 163 184)" }}
                tickLine={false}
                axisLine={false}
                width={36}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                content={
                  <ReportChartTooltip
                    formatter={(v) =>
                      `${typeof v === "number" ? v.toFixed(2).replace(".", ",") : v}%`
                    }
                  />
                }
                cursor={{ fill: "rgb(15 23 42 / 0.04)" }}
              />
              <Bar
                dataKey="avgEngagement"
                name="Envolvimento"
                radius={[6, 6, 0, 0]}
              >
                {reportData.bestDays.map((d) => (
                  <Cell
                    key={d.day}
                    fill={
                      d.isLeader
                        ? "rgb(var(--accent-primary))"
                        : "rgb(var(--accent-primary) / 0.18)"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </ReportSection>
  );
}
