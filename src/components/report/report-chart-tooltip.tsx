interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
}

interface ReportChartTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  valueSuffix?: string;
  formatter?: (value: number | string, name?: string) => string;
}

export function ReportChartTooltip({
  active,
  payload,
  label,
  valueSuffix = "",
  formatter,
}: ReportChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-surface-secondary border border-border-default/40 rounded-lg shadow-lg px-3 py-2.5 min-w-[140px]">
      {label !== undefined && (
        <p className="text-eyebrow-sm text-content-tertiary mb-1.5">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-content-secondary">{entry.name}</span>
            </div>
            <span className="font-mono font-medium text-content-primary">
              {formatter && entry.value !== undefined
                ? formatter(entry.value, entry.name)
                : `${entry.value?.toLocaleString("pt-PT")}${valueSuffix}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
