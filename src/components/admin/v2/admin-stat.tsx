/**
 * AdminStat — bloco eyebrow + valor + delta + sub.
 *
 * Reutilizado por `KPICard`, secções de despesa, células do funil, etc.
 * Garante que todos os números do admin têm a mesma família mono e
 * a mesma hierarquia visual.
 */

import { type ReactNode } from "react";
import { ACCENT_TEXT, type AdminAccent } from "./admin-tokens";

type StatSize = "sm" | "md" | "lg" | "hero";

const VALUE_CLS: Record<StatSize, string> = {
  sm: "text-lg",
  md: "text-[1.625rem] leading-tight",
  lg: "text-4xl leading-tight",
  hero: "text-[56px] leading-[1] tracking-[-0.04em]",
};

interface AdminStatProps {
  eyebrow?: ReactNode;
  value: ReactNode;
  size?: StatSize;
  delta?: { text: string; direction: "up" | "down" };
  /** Sub-linha em accent (ex.: "87 reports"). */
  highlightSub?: { text: string; accent: AdminAccent };
  /** Sub-linha neutra. */
  sub?: ReactNode;
  /** Cor do valor (override raro, ex.: cartão hero). */
  valueClassName?: string;
  eyebrowClassName?: string;
  subClassName?: string;
  /** Quando definido, eyebrow/value/sub usam flex-col com este gap (px) e os margins internos são neutralizados. */
  gap?: number;
}

export function AdminStat({
  eyebrow,
  value,
  size = "md",
  delta,
  highlightSub,
  sub,
  valueClassName = "text-admin-text-primary",
  eyebrowClassName,
  subClassName = "text-admin-text-tertiary",
  gap,
}: AdminStatProps) {
  const deltaCls =
    delta?.direction === "up"
      ? "text-admin-revenue-700"
      : "text-admin-danger-500";

  const useGap = typeof gap === "number";
  const eyebrowMb = useGap ? "" : "mb-2";
  const subMt = useGap ? "" : highlightSub ? "mt-0.5" : "mt-1.5";
  const highlightMt = useGap ? "" : "mt-1.5";

  return (
    <div
      style={
        useGap
          ? { display: "flex", flexDirection: "column", gap: `${gap}px` }
          : undefined
      }
    >
      {eyebrow ? (
        <p
          className={`admin-eyebrow ${eyebrowMb} ${eyebrowClassName ?? ""}`.trim()}
        >
          {eyebrow}
        </p>
      ) : null}
      <div className="flex items-baseline gap-2">
        <span
          className={`font-mono font-medium tracking-tight ${VALUE_CLS[size]} ${valueClassName}`}
        >
          {value}
        </span>
        {delta ? (
          <span className={`text-xs ${deltaCls}`}>
            {delta.direction === "up" ? "▲" : "▼"} {delta.text}
          </span>
        ) : null}
      </div>
      {highlightSub ? (
        <p
          className={`text-xs ${highlightMt}`.trim()}
          style={{ color: ACCENT_TEXT[highlightSub.accent] }}
        >
          {highlightSub.text}
        </p>
      ) : null}
      {sub ? (
        <p className={`text-[11px] ${subClassName} ${subMt}`.trim()}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}