/**
 * AdminCard — wrapper único para todos os cartões do admin v2.
 *
 * EMERGÊNCIA (2026-04-27): substituídos tokens Tailwind/CSS por inline styles
 * com hex literais para garantir renderização visível independentemente da
 * cadeia de tokens. Inline styles têm a maior especificidade e não dependem
 * de @theme inline a ser processado correctamente pelo Tailwind v4.
 *
 * Variantes:
 *   - default      → fundo branco, borda cinzenta, radius 16px, sombra
 *   - accent-left  → border-left 3px com cor da família
 *   - hero         → gradiente esmeralda explícito
 *   - flush        → sem padding interno
 */

import { type CSSProperties, type ReactNode } from "react";
import { type AdminAccent } from "./admin-tokens";

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

/** Hex literais — duplicam ACCENT_500 mas sem depender de var(--admin-*). */
const ACCENT_HEX: Record<AdminAccent, string> = {
  revenue: "#1D9E75",
  "revenue-alt": "#97C459",
  leads: "#534AB7",
  expense: "#BA7517",
  signal: "#D85A30",
  danger: "#E24B4A",
  info: "#378ADD",
  neutral: "#888780",
};

const BASE_BG = "#FFFFFF";
const BASE_BORDER = "#D3D1C7";
const BASE_TEXT = "#2C2C2A";
const BASE_RADIUS = 16;
const BASE_SHADOW =
  "0 1px 2px rgba(44,44,42,0.06), 0 8px 24px rgba(44,44,42,0.08)";

export function AdminCard({
  variant = "default",
  accent = "neutral",
  className = "",
  style,
  children,
  as: Tag = "div",
}: AdminCardProps) {
  const baseStyle: CSSProperties = {
    backgroundColor: BASE_BG,
    border: `1px solid ${BASE_BORDER}`,
    borderRadius: BASE_RADIUS,
    boxShadow: BASE_SHADOW,
    color: BASE_TEXT,
    padding: variant === "flush" ? 0 : 24,
  };

  if (variant === "accent-left") {
    baseStyle.borderLeft = `3px solid ${ACCENT_HEX[accent]}`;
  }

  if (variant === "hero") {
    baseStyle.background =
      "linear-gradient(135deg, #E1F5EE 0%, #EAF3DE 100%)";
    baseStyle.border = "1px solid #5DCAA5";
  }

  return (
    <Tag
      className={className.trim()}
      style={{ ...baseStyle, ...style }}
    >
      {children}
    </Tag>
  );
}