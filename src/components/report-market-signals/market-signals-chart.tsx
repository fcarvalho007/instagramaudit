/**
 * Compact multi-line trend chart for the "Sinais de Mercado" section.
 *
 * Renders up to 3 keyword series from a Google Trends weekly time-series.
 * Pure presentational: receives already-normalised series (no nulls in the
 * keyword index) and renders with Recharts (already a project dependency,
 * matching `report-temporal-chart`).
 */
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { GoogleTrendsResult } from "@/lib/dataforseo/endpoints/google-trends";

const SERIES_COLORS = [
  "var(--accent-primary, #06B6D4)",
  "var(--accent-secondary, #6366F1)",
  "var(--accent-tertiary, #3B82F6)",
];

interface MarketSignalsChartProps {
  trends: GoogleTrendsResult;
  usableKeywords: string[];
}

interface ChartRow {
  label: string;
  [series: string]: string | number | null;
}

function formatBucket(dateFrom?: string): string {
  if (!dateFrom) return "";
  // ISO YYYY-MM-DD → "MMM" PT short month (e.g. "abr").
  const d = new Date(dateFrom);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-PT", { month: "short" }).replace(".", "");
}

export function MarketSignalsChart({
  trends,
  usableKeywords,
}: MarketSignalsChartProps) {
  const graph = trends.items?.find(
    (it) => Array.isArray(it.keywords) && Array.isArray(it.data),
  );
  if (!graph || !graph.keywords || !graph.data) return null;

  const keywords = graph.keywords;
  const usableSet = new Set(usableKeywords);
  // Indices of usable keywords inside the graph.keywords array, capped at 3.
  const indices: number[] = [];
  keywords.forEach((kw, i) => {
    if (usableSet.has(kw) && indices.length < 3) indices.push(i);
  });
  if (indices.length === 0) return null;

  const rows: ChartRow[] = graph.data.map((row) => {
    const r: ChartRow = { label: formatBucket(row.date_from) };
    for (const i of indices) {
      const v = row.values?.[i];
      r[keywords[i]] = typeof v === "number" && Number.isFinite(v) ? v : null;
    }
    return r;
  });

  return (
    <div className="w-full h-56 md:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid
            stroke="var(--border-subtle, rgba(0,0,0,0.08))"
            strokeDasharray="2 4"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{
              fill: "var(--content-tertiary, #6B7280)",
              fontSize: 10,
              fontFamily: "var(--font-mono, ui-monospace)",
            }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tick={{
              fill: "var(--content-tertiary, #6B7280)",
              fontSize: 10,
              fontFamily: "var(--font-mono, ui-monospace)",
            }}
            tickLine={false}
            axisLine={false}
            width={32}
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
          />
          <Tooltip
            contentStyle={{
              background: "var(--surface-elevated, #ffffff)",
              border: "1px solid var(--border-subtle, rgba(0,0,0,0.08))",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "var(--content-secondary, #374151)" }}
          />
          {indices.map((i, idx) => (
            <Line
              key={keywords[i]}
              type="monotone"
              dataKey={keywords[i]}
              stroke={SERIES_COLORS[idx % SERIES_COLORS.length]}
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 3 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {indices.map((i, idx) => (
          <span key={keywords[i]} className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 rounded-full"
              style={{
                background: SERIES_COLORS[idx % SERIES_COLORS.length],
              }}
            />
            <span className="font-mono text-[11px] text-content-secondary">
              {keywords[i]}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
