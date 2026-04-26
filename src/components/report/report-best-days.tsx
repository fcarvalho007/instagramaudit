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
  return (
    <ReportSection
      label="Dias da semana"
      title="Desempenho médio por dia"
      subtitle="Envolvimento médio agregado das publicações por dia da semana."
    >
      <div className="bg-surface-secondary border border-border-default/40 rounded-xl shadow-card p-4 md:p-6">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={reportData.bestDays}
              margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="bar-leader" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
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
                    fill={d.isLeader ? "url(#bar-leader)" : "#CBD5E1"}
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
