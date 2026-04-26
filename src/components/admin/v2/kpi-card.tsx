/**
 * KPICard — cartão métrico do admin v2.
 *
 * 3 variantes:
 *   - default      → fundo branco, borda 0.5px
 *   - highlighted  → gradiente esmeralda + borda verde 400 (cartão herói)
 *   - accent-left  → border-left 3px com cor da família
 *
 * Estrutura:
 *   eyebrow (12px secondary) → valor (26px/500) → delta opcional → subtexto (11px tertiary)
 */

import { type ReactNode, type CSSProperties } from "react";
import {
  ACCENT_500,
  ACCENT_TEXT,
  ADMIN_BORDER,
  ADMIN_LITERAL,
  type AdminAccent,
} from "./admin-tokens";

type KPIVariant = "default" | "highlighted" | "accent-left";

interface KPICardProps {
  eyebrow: string;
  value: ReactNode;
  variant?: KPIVariant;
  accent?: AdminAccent;
  delta?: { text: string; direction: "up" | "down" };
  sub?: ReactNode;
  /** Texto destacado entre o valor e o subtexto, em cor accent (ex.: "87 reports"). */
  highlightSub?: { text: string; accent: AdminAccent };
  className?: string;
}

export function KPICard({
  eyebrow,
  value,
  variant = "default",
  accent = "neutral",
  delta,
  sub,
  highlightSub,
  className = "",
}: KPICardProps) {
  const isHero = variant === "highlighted";

  const baseStyle: CSSProperties = {
    border: ADMIN_BORDER,
    borderRadius: 12,
    padding: "14px 16px",
    backgroundColor: "#ffffff",
  };

  if (variant === "accent-left") {
    baseStyle.borderLeft = `3px solid ${ACCENT_500[accent]}`;
  }

  if (isHero) {
    baseStyle.background = ADMIN_LITERAL.heroGradient;
    baseStyle.border = `0.5px solid ${ADMIN_LITERAL.heroGradientBorder}`;
  }

  const eyebrowColor = isHero
    ? ADMIN_LITERAL.heroGradientEyebrow
    : "rgb(var(--admin-neutral-600))";
  const valueColor = isHero
    ? ADMIN_LITERAL.heroGradientValue
    : "rgb(var(--admin-neutral-900))";
  const subColor = isHero
    ? ADMIN_LITERAL.heroGradientDelta
    : "rgb(var(--admin-neutral-400))";

  const deltaColor = delta
    ? delta.direction === "up"
      ? isHero
        ? ADMIN_LITERAL.heroGradientDelta
        : "rgb(var(--admin-revenue-700))"
      : "rgb(var(--admin-danger-500))"
    : undefined;

  return (
    <div className={className} style={baseStyle}>
      <p
        className="admin-eyebrow"
        style={{ color: eyebrowColor, marginBottom: 8 }}
      >
        {eyebrow}
      </p>
      <div className="flex items-baseline gap-2">
        <span
          style={{
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: "-0.01em",
            color: valueColor,
            lineHeight: 1.1,
          }}
        >
          {value}
        </span>
        {delta ? (
          <span style={{ fontSize: 12, color: deltaColor }}>
            {delta.direction === "up" ? "▲" : "▼"} {delta.text}
          </span>
        ) : null}
      </div>
      {highlightSub ? (
        <p
          style={{
            marginTop: 6,
            fontSize: 12,
            color: ACCENT_TEXT[highlightSub.accent],
          }}
        >
          {highlightSub.text}
        </p>
      ) : null}
      {sub ? (
        <p
          style={{
            marginTop: highlightSub ? 2 : 6,
            fontSize: 11,
            color: subColor,
          }}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}