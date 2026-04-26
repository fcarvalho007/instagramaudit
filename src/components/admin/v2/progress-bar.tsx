/**
 * ProgressBar — barra horizontal 8px.
 *
 * - Fundo: cor temática a 12% opacidade.
 * - Preenchimento: cor temática sólida.
 * - `showCap`: marcador vertical vermelho (1px, danger 700) na posição 100%.
 * - `segments`: array de blocos coloridos contíguos em vez de preenchimento simples
 *   (usado na barra "Despesa total" — Apify + OpenAI lado-a-lado).
 */

import { type CSSProperties } from "react";
import { ACCENT_500, type AdminAccent } from "./admin-tokens";

interface ProgressBarSimpleProps {
  value: number;
  max: number;
  color: AdminAccent;
  showCap?: boolean;
  segments?: never;
  className?: string;
}

interface ProgressBarSegmentedProps {
  segments: { value: number; color: AdminAccent }[];
  /** No modo segmentado, max representa o total visual (default: soma dos segments). */
  max?: number;
  value?: never;
  color?: never;
  showCap?: boolean;
  className?: string;
}

type ProgressBarProps = ProgressBarSimpleProps | ProgressBarSegmentedProps;

export function ProgressBar(props: ProgressBarProps) {
  if ("segments" in props && props.segments) {
    const total =
      props.max ?? props.segments.reduce((acc, s) => acc + s.value, 0);
    const trackStyle: CSSProperties = {
      height: 8,
      borderRadius: 4,
      backgroundColor: "rgb(var(--admin-neutral-100))",
      overflow: "hidden",
      display: "flex",
      width: "100%",
    };
    return (
      <div className={props.className} style={trackStyle} role="progressbar">
        {props.segments.map((seg, i) => (
          <div
            key={i}
            style={{
              width: `${(seg.value / total) * 100}%`,
              backgroundColor: ACCENT_500[seg.color],
              height: "100%",
            }}
          />
        ))}
      </div>
    );
  }

  const { value, max, color, showCap, className } = props as ProgressBarSimpleProps;
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const accent = ACCENT_500[color];

  return (
    <div
      className={className}
      style={{
        position: "relative",
        height: 8,
        borderRadius: 4,
        backgroundColor: `color-mix(in oklab, ${accent} 12%, transparent)`,
        overflow: "visible",
      }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${pct}%`,
          borderRadius: 4,
          backgroundColor: accent,
        }}
      />
      {showCap ? (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -2,
            bottom: -2,
            right: 0,
            width: 1,
            backgroundColor: "rgb(var(--admin-danger-700))",
          }}
        />
      ) : null}
    </div>
  );
}