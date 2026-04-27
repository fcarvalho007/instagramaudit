/**
 * AdminCard — wrapper único para todos os cartões do admin v2.
 *
 * Refinamentos cinematográficos (prompt 4):
 *   - border 1px sólido `--admin-border-soft`
 *   - border-radius 14px
 *   - box-shadow editorial subtil
 *   - prop `padding` separada de `variant` (compact / default / loose / flush)
 *
 * Variantes:
 *   - default      → bg branco, border 1px soft, radius 14, shadow card
 *   - accent-left  → mesmo que default + border-left 3px com cor temática
 *   - hero         → gradient esmeralda subtil (#ECF7F1 → #F0F4E5), border 1px #5DCAA5
 *   - subtle       → bg `--admin-bg-subtle`, sem border, sem shadow
 *   - flush (legacy) → equivalente a `padding="flush"` em default
 */

import { type ReactNode } from "react";
import { ACCENT_500, type AdminAccent } from "./admin-tokens";

type AdminCardVariant =
  | "default"
  | "accent-left"
  | "hero"
  | "subtle"
  | "flush";

type AdminCardPadding = "compact" | "default" | "loose" | "flush";

interface AdminCardProps {
  variant?: AdminCardVariant;
  padding?: AdminCardPadding;
  accent?: AdminAccent;
  className?: string;
  children: ReactNode;
  /** Override do role semântico para a11y. */
  as?: "div" | "section" | "article" | "li";
}

const PADDING_STYLE: Record<AdminCardPadding, string> = {
  compact: "20px 24px",
  default: "28px 32px",
  loose: "40px 48px",
  flush: "0",
};

export function AdminCard({
  variant = "default",
  padding,
  accent = "neutral",
  className = "",
  children,
  as: Tag = "div",
}: AdminCardProps) {
  // Compatibilidade: variant="flush" mapeia para padding="flush".
  const effectivePadding: AdminCardPadding =
    padding ?? (variant === "flush" ? "flush" : "default");

  const style: React.CSSProperties = {
    padding: PADDING_STYLE[effectivePadding],
    borderRadius: 14,
  };

  if (variant === "hero") {
    style.backgroundImage =
      "linear-gradient(135deg, #ECF7F1 0%, #F0F4E5 100%)";
    style.border = "1px solid #5DCAA5";
    style.boxShadow = "var(--admin-shadow-card)";
  } else if (variant === "subtle") {
    style.backgroundColor = "var(--admin-bg-subtle)";
    style.border = "none";
  } else {
    style.backgroundColor = "var(--admin-bg-surface)";
    style.border = "1px solid var(--color-admin-border)";
    style.boxShadow = "var(--admin-shadow-card)";
  }

  if (variant === "accent-left") {
    style.borderLeft = `3px solid ${ACCENT_500[accent]}`;
  }

  return (
    <Tag
      className={`text-admin-text-primary ${className}`.trim()}
      style={style}
    >
      {children}
    </Tag>
  );
}