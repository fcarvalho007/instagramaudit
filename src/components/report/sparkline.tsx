type SparklineTone = "accent" | "positive" | "negative" | "neutral";

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  tone?: SparklineTone;
  ariaLabel?: string;
}

const TONE_VAR: Record<SparklineTone, string> = {
  accent: "--accent-primary",
  positive: "--signal-success",
  negative: "--signal-danger",
  neutral: "--text-secondary",
};

/**
 * Minimal SVG sparkline used in the hero KPI cards. Renders nothing when
 * the data array is empty so callers can omit `sparklineData` for KPIs
 * that don't have a series (e.g. a binary "Estado do benchmark" card).
 * Colors come from theme tokens — no hardcoded hex.
 */
export function Sparkline({
  data,
  width = 84,
  height = 32,
  tone = "accent",
  ariaLabel = "Tendência dos últimos 15 dias",
}: SparklineProps) {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const linePath = `M${points.join(" L")}`;
  const areaPath = `M0,${height} L${points.join(" L")} L${width},${height} Z`;
  const stroke = `rgb(var(${TONE_VAR[tone]}))`;
  const fillStart = `rgb(var(${TONE_VAR[tone]}) / 0.18)`;
  const fillEnd = `rgb(var(${TONE_VAR[tone]}) / 0)`;
  const gradId = `sparkline-grad-${tone}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillStart} />
          <stop offset="100%" stopColor={fillEnd} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}