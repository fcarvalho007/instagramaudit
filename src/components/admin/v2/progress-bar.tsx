/**
 * ProgressBar — barra horizontal 8px.
 *
 * - Fundo: cor temática a 12% opacidade.
 * - Preenchimento: cor temática sólida.
 * - `showCap`: marcador vertical vermelho (1px) na posição 100%.
 * - `segments`: blocos coloridos contíguos (usado na "Despesa total").
 */

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
    return (
      <div
        role="progressbar"
        className={`flex h-2 w-full overflow-hidden rounded ${props.className ?? ""}`.trim()}
        style={{ backgroundColor: "var(--admin-border-subtle)" }}
      >
        {props.segments.map((seg, i) => (
          <div
            key={i}
            className="h-full"
            style={{
              width: `${(seg.value / total) * 100}%`,
              backgroundColor: ACCENT_500[seg.color],
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
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={`relative h-2 rounded ${className ?? ""}`.trim()}
      style={{
        backgroundColor: `color-mix(in oklab, ${accent} 12%, transparent)`,
      }}
    >
      <div
        className="absolute inset-0 rounded"
        style={{
          width: `${pct}%`,
          backgroundColor: accent,
        }}
      />
      {showCap ? (
        <div
          aria-hidden="true"
          className="absolute right-0 -top-0.5 -bottom-0.5 w-px bg-admin-danger-700"
        />
      ) : null}
    </div>
  );
}