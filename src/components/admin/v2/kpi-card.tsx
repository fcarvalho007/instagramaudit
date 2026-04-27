/**
 * KPICard — cartão métrico do admin v2.
 *
 * Fino wrapper sobre `AdminCard` + `AdminStat`. Toda a estilização vem
 * dos componentes partilhados. Variantes:
 *   - default      → cartão branco
 *   - hero         → gradient esmeralda (cartão dominante de receita)
 *   - accent-left  → borda esquerda 3px com cor da família
 */

import { type ReactNode } from "react";
import { AdminCard } from "./admin-card";
import { AdminStat } from "./admin-stat";
import { type AdminAccent } from "./admin-tokens";

type KPIVariant = "default" | "hero" | "accent-left";

interface KPICardProps {
  eyebrow: string;
  value: ReactNode;
  variant?: KPIVariant;
  accent?: AdminAccent;
  delta?: { text: string; direction: "up" | "down" };
  sub?: ReactNode;
  highlightSub?: { text: string; accent: AdminAccent };
  size?: "sm" | "md" | "lg";
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
  size = "md",
  className,
}: KPICardProps) {
  const cardVariant = variant === "hero" ? "hero" : variant === "accent-left" ? "accent-left" : "default";

  const isHero = variant === "hero";
  const valueClass = isHero
    ? "text-admin-revenue-900"
    : "text-admin-text-primary";
  const eyebrowClass = isHero ? "text-admin-revenue-800" : undefined;
  const subClass = isHero ? "text-admin-revenue-700" : "text-admin-text-tertiary";

  return (
    <AdminCard
      variant={cardVariant}
      accent={accent}
      className={`!p-4 ${className ?? ""}`.trim()}
    >
      <AdminStat
        eyebrow={eyebrow}
        value={value}
        size={size}
        delta={delta}
        sub={sub}
        highlightSub={highlightSub}
        valueClassName={valueClass}
        eyebrowClassName={eyebrowClass}
        subClassName={subClass}
      />
    </AdminCard>
  );
}