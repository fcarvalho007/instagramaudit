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
import { AdminInfoTooltip } from "./admin-info-tooltip";
import { type AdminAccent } from "./admin-tokens";

type KPIVariant = "default" | "hero" | "accent-left";
type KPISize = "sm" | "md" | "lg" | "hero";

interface KPICardProps {
  eyebrow: string;
  value: ReactNode;
  variant?: KPIVariant;
  accent?: AdminAccent;
  delta?: { text: string; direction: "up" | "down" };
  sub?: ReactNode;
  highlightSub?: { text: string; accent: AdminAccent };
  size?: KPISize;
  /** Tooltip "i" ao lado do eyebrow com explicação da métrica. */
  info?: string;
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
  info,
  className,
}: KPICardProps) {
  const cardVariant = variant === "hero" ? "hero" : variant === "accent-left" ? "accent-left" : "default";

  const isHero = variant === "hero";
  const valueClass = isHero
    ? "text-admin-revenue-900"
    : "text-admin-text-primary";
  const eyebrowClass = isHero ? "text-admin-revenue-800" : undefined;
  const subClass = isHero ? "text-admin-revenue-700" : "text-admin-text-tertiary";

  // Padding contextual: hero respira mais, sm aperta um pouco.
  const paddingClass =
    size === "hero" ? "!p-8" : size === "lg" ? "!p-6" : size === "sm" ? "!p-4" : "!p-5";

  return (
    <AdminCard
      variant={cardVariant}
      accent={accent}
      className={`${paddingClass} ${className ?? ""}`.trim()}
    >
      <AdminStat
        eyebrow={
          info ? (
            <span className="inline-flex items-center gap-1.5">
              {eyebrow}
              <AdminInfoTooltip label={info} />
            </span>
          ) : (
            eyebrow
          )
        }
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