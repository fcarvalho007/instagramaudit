import { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ReportSection } from "./report-section";
import { ReportChartTooltip } from "./report-chart-tooltip";
import { useReportData } from "./report-data-context";
import { cn } from "@/lib/utils";

type SeriesKey = "likes" | "comments" | "views";

const SERIES: Array<{
  key: SeriesKey;
  label: string;
  color: string;
  dashed?: boolean;
}> = [
  { key: "likes", label: "Gostos", color: "#3B82F6" },
  { key: "comments", label: "Comentários", color: "#06B6D4" },
  { key: "views", label: "Visualizações", color: "#6366F1", dashed: true },
];

export function ReportTemporalChart() {
  const [active, setActive] = useState<Record<SeriesKey, boolean>>({
    likes: true,
    comments: true,
    views: true,
  });

  const toggle = (k: SeriesKey) => setActive((s) => ({ ...s, [k]: !s[k] }));

  const chips = (
    <div className="flex flex-wrap items-center gap-2">
      {SERIES.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => toggle(s.key)}
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
            active[s.key]
              ? "bg-surface-secondary border-border-strong/40 text-content-primary"
              : "bg-transparent border-border-default/30 text-content-tertiary hover:text-content-secondary",
          )}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: s.color }}
          />
          {s.label}
        </button>
      ))}
    </div>
  );

  return (
    <ReportSection
      label="Evolução temporal · últimos 30 dias"
      title="Gostos, comentários e visualizações ao longo do tempo"
      subtitle="Soma diária dos sinais de envolvimento por publicação ativa."
      action={chips}
    >
      <div className="bg-surface-secondary border border-border-default/40 rounded-xl shadow-card p-4 md:p-6">
        <div className="h-[320px] md:h-[380px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={reportData.temporalSeries}
              margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="grad-likes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient
                  id="grad-comments"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.14} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgb(15 23 42 / 0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "rgb(148 163 184)" }}
                tickLine={false}
                axisLine={false}
                interval={3}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "rgb(148 163 184)" }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                content={<ReportChartTooltip />}
                cursor={{ stroke: "rgb(15 23 42 / 0.12)", strokeWidth: 1 }}
              />
              {active.likes && (
                <Area
                  type="monotone"
                  dataKey="likes"
                  name="Gostos"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="url(#grad-likes)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              )}
              {active.comments && (
                <Area
                  type="monotone"
                  dataKey="comments"
                  name="Comentários"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  fill="url(#grad-comments)"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              )}
              {active.views && (
                <Area
                  type="monotone"
                  dataKey="views"
                  name="Visualizações"
                  stroke="#6366F1"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  fill="transparent"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 mt-2 border-t border-border-subtle/30">
          {SERIES.map((s) => (
            <div
              key={s.key}
              className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-content-tertiary"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.label}
            </div>
          ))}
        </div>
      </div>
    </ReportSection>
  );
}
