/**
 * Helpers partilhados para `<Tooltip>` do Recharts no admin v2.
 *
 * `DARK_TOOLTIP_PROPS` substitui `contentStyle` / `labelStyle` /
 * `itemStyle` / `cursor` por um look cinematográfico dark uniforme.
 * Spread directo: `<Tooltip {...DARK_TOOLTIP_PROPS} />`.
 */

import type { ComponentProps } from "react";
import type { Tooltip as RechartsTooltip } from "recharts";

type RechartsTooltipProps = ComponentProps<typeof RechartsTooltip>;

export const DARK_TOOLTIP_PROPS = {
  cursor: { fill: "rgba(31,30,27,0.06)" },
  contentStyle: {
    backgroundColor: "#1F1E1B",
    border: "none",
    borderRadius: 8,
    padding: "10px 14px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    color: "#FAF9F5",
  },
  labelStyle: {
    color: "#888780",
    fontFamily: "JetBrains Mono, Menlo, Consolas, monospace",
    fontSize: 10,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    marginBottom: 4,
  },
  itemStyle: {
    color: "#FAF9F5",
    fontFamily: "JetBrains Mono, Menlo, Consolas, monospace",
    fontSize: 12,
    padding: 0,
  },
  wrapperStyle: { outline: "none" },
} satisfies Partial<RechartsTooltipProps>;

/** Tick uniforme para eixos — JetBrains Mono 10px stone-500. */
export const CHART_AXIS_TICK = {
  fontSize: 10,
  fontFamily: "JetBrains Mono, Menlo, Consolas, monospace",
  fill: "#888780",
} as const;

/** Stroke padrão para grid horizontal subtil. */
export const CHART_GRID_STROKE = "#F1EFE8";
/** Stroke padrão para axisLine do eixo X. */
export const CHART_AXIS_LINE = "#E8E5DA";