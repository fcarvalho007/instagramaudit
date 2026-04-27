/**
 * AdminCard — wrapper único para todos os cartões do admin v2.
 *
 * Centraliza border, radius, padding, shadow e variantes para que
 * nenhuma secção tenha de repetir o mesmo `style={{}}`.
 *
 * Variantes:
 *   - default      → fundo branco, borda admin, radius xl
 *   - accent-left  → border-left 3px com cor da família + restante igual a default
 *   - hero         → gradient subtil esmeralda (cartão herói de receita)
 *   - flush        → sem padding (para cartões que dividem zonas internas)
 */

import { type CSSProperties, type ReactNode } from "react";
import { ACCENT_500, type AdminAccent } from "./admin-tokens";

type AdminCardVariant = "default" | "accent-left" | "hero" | "flush";

interface AdminCardProps {
  variant?: AdminCardVariant;
  accent?: AdminAccent;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  /** Override do role semântico para a11y. */
  as?: "div" | "section" | "article" | "li";
}

export function AdminCard({
  variant = "default",
  accent = "neutral",
  className = "",
  style,
  children,
  as: Tag = "div",
}: AdminCardProps) {
  const base =
    "rounded-xl border border-admin-border bg-admin-surface text-admin-text-primary shadow-[var(--shadow-admin-card)]";
  const padded = variant === "flush" ? "" : "p-6";
  const heroStyles =
    variant === "hero"
      ? "bg-gradient-to-br from-admin-revenue-50 to-admin-revenue-alt-100 border-admin-revenue-400"
      : "";
  const accentLeftStyle =
    variant === "accent-left"
      ? { borderLeft: `3px solid ${ACCENT_500[accent]}` }
      : undefined;

  return (
    <Tag
      className={`${base} ${padded} ${heroStyles} ${className}`.trim()}
      style={{ ...accentLeftStyle, ...style }}
    >
      {children}
    </Tag>
  );
}