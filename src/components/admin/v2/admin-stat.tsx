/**
 * AdminStat — bloco eyebrow + valor + delta + sub.
 *
 * Refinamentos prompt 4:
 *   - tamanhos `sm | md | lg | hero` com escala tipográfica revista
 *   - valores em JetBrains Mono com `tnum` (tabular) e letter-spacing
 *     negativo proporcional ao tamanho
 *   - delta como pill com fundo subtil (substitui o inline)
 *   - prop `eyebrowExtra` para slot opcional ao lado do eyebrow
 *     (usado pelo `KPICard` para o "i" tooltip)
 */

import { type ReactNode } from "react";
import { ACCENT_TEXT, type AdminAccent } from "./admin-tokens";

export type StatSize = "sm" | "md" | "lg" | "hero";

interface SizeSpec {
  fontSize: number;
  letterSpacing: string;
}

const SIZE_SPEC: Record<StatSize, SizeSpec> = {
  sm: { fontSize: 22, letterSpacing: "-0.01em" },
  md: { fontSize: 28, letterSpacing: "-0.02em" },
  lg: { fontSize: 36, letterSpacing: "-0.03em" },
  hero: { fontSize: 56, letterSpacing: "-0.04em" },
};

interface AdminStatProps {
  eyebrow?: ReactNode;
  /** Slot opcional renderizado depois do eyebrow (ex.: tooltip "i"). */
  eyebrowExtra?: ReactNode;
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
  /** Cor do delta-pill quando o cartão é hero (texto em tom escuro esmeralda). */
  deltaTone?: "default" | "hero";
}

function DeltaPill({
  delta,
  tone,
}: {
  delta: { text: string; direction: "up" | "down" };
  tone: "default" | "hero";
}) {
  const isUp = delta.direction === "up";
  const arrow = isUp ? "▲" : "▼";
  const baseStyle: React.CSSProperties = {
    fontFamily: "JetBrains Mono, Menlo, Consolas, monospace",
    fontSize: 12,
    fontWeight: 500,
    padding: "3px 10px",
    borderRadius: 12,
    lineHeight: 1,
    letterSpacing: 0,
  };
  if (isUp) {
    return (
      <span
        className="inline-flex items-center"
        style={{
          ...baseStyle,
          backgroundColor:
            tone === "hero"
              ? "rgba(15,110,86,0.15)"
              : "rgba(15,110,86,0.10)",
          color: tone === "hero" ? "#0F6E56" : "#0F6E56",
        }}
      >
        {arrow} {delta.text}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center"
      style={{
        ...baseStyle,
        backgroundColor: "rgba(163,45,45,0.08)",
        color: "#A32D2D",
      }}
    >
      {arrow} {delta.text}
    </span>
  );
}

export function AdminStat({
  eyebrow,
  eyebrowExtra,
  value,
  size = "md",
  delta,
  highlightSub,
  sub,
  valueClassName = "text-admin-text-primary",
  eyebrowClassName,
  subClassName = "text-admin-text-tertiary",
  deltaTone = "default",
}: AdminStatProps) {
  const spec = SIZE_SPEC[size];

  return (
    <div>
      {eyebrow || eyebrowExtra ? (
        <div className="mb-2 flex items-center gap-1.5">
          {eyebrow ? (
            <p
              className={`admin-eyebrow ${eyebrowClassName ?? ""}`.trim()}
            >
              {eyebrow}
            </p>
          ) : null}
          {eyebrowExtra}
        </div>
      ) : null}
      <div className="flex flex-wrap items-baseline gap-3">
        <span
          className={`admin-num font-medium ${valueClassName}`}
          style={{
            fontSize: spec.fontSize,
            letterSpacing: spec.letterSpacing,
            lineHeight: 1.05,
          }}
        >
          {value}
        </span>
        {delta ? <DeltaPill delta={delta} tone={deltaTone} /> : null}
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
        <p
          className={`${subClassName} ${highlightSub ? "mt-0.5" : "mt-2"}`}
          style={{ fontSize: 12, lineHeight: 1.4 }}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}