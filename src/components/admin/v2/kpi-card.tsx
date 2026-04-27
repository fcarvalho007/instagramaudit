/**
 * KPICard — cartão métrico do admin v2.
 *
 * Refinamentos prompt 4:
 *   - novo size `hero` (56px), `lg` (36px), `md` (28px), `sm` (22px)
 *   - prop `info?: string` → `<AdminInfoTooltip>` ao lado do eyebrow
 *   - padding interno alinhado ao tamanho:
 *       hero  → 28px 32px
 *       lg    → 24px 28px
 *       md    → 20px 24px
 *       sm    → 16px 20px
 *   - delta passa a ser pill (via `AdminStat`)
 */

import { type ReactNode } from "react";
import { AdminCard } from "./admin-card";
import { AdminStat, type StatSize } from "./admin-stat";
import { AdminInfoTooltip } from "./admin-info-tooltip";
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
  size?: StatSize;
  /** Texto do tooltip "i" mostrado ao lado do eyebrow. */
  info?: string;
  className?: string;
}

const PADDING_BY_SIZE: Record<StatSize, string> = {
  hero: "28px 32px",
  lg: "24px 28px",
  md: "20px 24px",
  sm: "16px 20px",
};

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
  const cardVariant =
    variant === "hero"
      ? "hero"
      : variant === "accent-left"
        ? "accent-left"
        : "default";

  const isHero = variant === "hero";
  const valueClass = isHero
    ? "text-admin-revenue-900"
    : "text-admin-text-primary";
  const eyebrowClass = isHero ? "text-admin-revenue-800" : undefined;
  const subClass = isHero
    ? "text-admin-revenue-700"
    : "text-admin-text-tertiary";

  return (
    <AdminCard
      variant={cardVariant}
      padding="flush"
      accent={accent}
      className={className ?? ""}
    >
      <div style={{ padding: PADDING_BY_SIZE[size] }}>
        <AdminStat
          eyebrow={eyebrow}
          eyebrowExtra={
            info ? (
              <AdminInfoTooltip text={info} />
            ) : undefined
          }
          value={value}
          size={size}
          delta={delta}
          sub={sub}
          highlightSub={highlightSub}
          valueClassName={valueClass}
          eyebrowClassName={eyebrowClass}
          subClassName={subClass}
          deltaTone={isHero ? "hero" : "default"}
        />
      </div>
    </AdminCard>
  );
}