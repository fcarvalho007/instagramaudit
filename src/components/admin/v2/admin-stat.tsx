/**
 * AdminStat — bloco eyebrow + valor + delta + sub.
 *
 * Reutilizado por `KPICard`, secções de despesa, células do funil, etc.
 * Garante que todos os números do admin têm a mesma família mono e
 * a mesma hierarquia visual.
 */

import { type ReactNode } from "react";
import { ACCENT_TEXT, type AdminAccent } from "./admin-tokens";

type StatSize = "sm" | "md" | "lg";

const VALUE_CLS: Record<StatSize, string> = {
  sm: "text-lg",
  md: "text-[1.625rem] leading-tight",
  lg: "text-4xl leading-tight",
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
}: AdminStatProps) {
  const deltaCls =
    delta?.direction === "up"
      ? "text-admin-revenue-700"
      : "text-admin-danger-500";

  return (
    <div>
      {eyebrow ? (
        <p
          className={`admin-eyebrow mb-2 ${eyebrowClassName ?? ""}`.trim()}
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
          className="mt-1.5 text-xs"
          style={{ color: ACCENT_TEXT[highlightSub.accent] }}
        >
          {highlightSub.text}
        </p>
      ) : null}
      {sub ? (
        <p className={`text-[11px] ${subClassName} ${highlightSub ? "mt-0.5" : "mt-1.5"}`}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}